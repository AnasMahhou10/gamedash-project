using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    public enum GameState { Login, Lobby, InQueue, InGame, Results, MapEditor }
    public GameState CurrentState { get; private set; } = GameState.Lobby;

    public int    CurrentMatchId    { get; private set; }
    public int    CurrentOpponentId { get; private set; }
    public string CurrentMode       { get; private set; }
    public int    CurrentMapId      { get; private set; }
    public bool   PlayerWon         { get; private set; }

    public UserProfile         LocalPlayer     { get; private set; }
    public FinishMatchResponse LastMatchResult { get; private set; }

    [Header("Scènes")]
    public string loginScene     = "Login";
    public string lobbyScene     = "Lobby";
    public string gameScene      = "Game";
    public string resultsScene   = "Results";
    public string mapEditorScene = "MapEditor";

    [Header("Polling matchmaking (secondes)")]
    public float pollInterval = 3f;

    private Coroutine _pollingCoroutine;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    // ── AUTH ──────────────────────────────────────────────────────

    public void OnLoginSuccess(UserProfile profile)
    {
        LocalPlayer = profile;
        TransitionTo(GameState.Lobby);
        SceneManager.LoadScene(lobbyScene);
    }

    /// <summary>Définit le joueur local sans naviguer (utilisé par le deeplink).</summary>
    public void SetLocalPlayer(UserProfile profile)
    {
        LocalPlayer = profile;
        Debug.Log($"[GameManager] Joueur défini : {profile.pseudo} (id={profile.id})");
    }

    public void GoToMapEditor()
    {
        TransitionTo(GameState.MapEditor);
        SceneManager.LoadScene(mapEditorScene);
    }

    public void GoToLobby()
    {
        TransitionTo(GameState.Lobby);
        SceneManager.LoadScene(lobbyScene);
    }

    // ── MATCHMAKING ───────────────────────────────────────────────

    public void StartMatchmaking(string mode)
    {
        CurrentMode = mode;
        TransitionTo(GameState.InQueue);
        StartCoroutine(JoinAndPoll(mode));
    }

    public void CancelMatchmaking()
    {
        if (_pollingCoroutine != null) StopCoroutine(_pollingCoroutine);
        StartCoroutine(ApiManager.Instance.LeaveQueue(
            () => { TransitionTo(GameState.Lobby); SceneManager.LoadScene(lobbyScene); },
            (err) => Debug.LogWarning("LeaveQueue error: " + err)
        ));
    }

    private IEnumerator JoinAndPoll(string mode)
    {
        bool joined = false;
        yield return ApiManager.Instance.JoinQueue(mode,
            (resp) => { Debug.Log("In queue: " + resp.message); joined = true; },
            (err)  => Debug.LogError("JoinQueue: " + err)
        );
        if (!joined) { TransitionTo(GameState.Lobby); yield break; }
        _pollingCoroutine = StartCoroutine(PollForMatch());
    }

    private IEnumerator PollForMatch()
    {
        while (CurrentState == GameState.InQueue)
        {
            yield return new WaitForSeconds(pollInterval);
            yield return ApiManager.Instance.GetCurrentMatch(
                (resp) =>
                {
                    if (resp.in_match && resp.match != null)
                    {
                        CurrentMatchId    = resp.match.match_id;
                        CurrentOpponentId = resp.match.opponent;
                        CurrentMode       = resp.match.mode;
                        CurrentMapId      = resp.match.map_id;
                        StartGame();
                    }
                },
                (err) => Debug.LogWarning("PollForMatch: " + err)
            );
        }
    }

    private void StartGame()
    {
        // If a map is assigned, fetch it first then load the scene so the GameController can build it
        if (CurrentMapId > 0)
        {
            StartCoroutine(ApiManager.Instance.GetMap(CurrentMapId, (mapResp) => {
                try
                {
                    // set pending map for the scene
                    MapTestController.PendingMap = MapData.FromBase64(mapResp.content_url);
                    MapTestController.PendingMapId = mapResp.id;
                    MapTestController.PendingMapTitle = mapResp.title ?? "Map";
                }
                catch (System.Exception ex)
                {
                    Debug.LogWarning("Failed to parse map from API: " + ex.Message);
                    MapTestController.PendingMap = null;
                    MapTestController.PendingMapId = -1;
                }
                TransitionTo(GameState.InGame);
                SceneManager.LoadScene(gameScene);
            }, (err) => {
                Debug.LogWarning("GetMap failed: " + err + " — loading game without map.");
                TransitionTo(GameState.InGame);
                SceneManager.LoadScene(gameScene);
            }));
            return;
        }

        TransitionTo(GameState.InGame);
        SceneManager.LoadScene(gameScene);
    }

    // ── FIN DE MATCH ──────────────────────────────────────────────

    public void ReportMatchEnd(int winnerId)
    {
        PlayerWon = (winnerId == LocalPlayer.id);
        StartCoroutine(SubmitMatchResult(winnerId));
    }

    private IEnumerator SubmitMatchResult(int winnerId)
    {
        bool resultOk = false;
        yield return ApiManager.Instance.PostMatchResult(CurrentMatchId, winnerId,
            () => resultOk = true,
            (err) => Debug.LogError("PostMatchResult: " + err)
        );
        if (!resultOk) yield break;
        yield return ApiManager.Instance.FinishMatch(CurrentMatchId, winnerId,
            (resp) =>
            {
                LastMatchResult = resp;
                // Refresh local profile so ELO / XP / level are up-to-date
                // We update LocalPlayer from the server then show results.
                StartCoroutine(ApiManager.Instance.GetMe((profile) => {
                    SetLocalPlayer(profile);
                    LastMatchResult = resp;
                    TransitionTo(GameState.Results);
                    SceneManager.LoadScene(resultsScene);
                }, (err) => {
                    Debug.LogWarning("Refresh profile failed: " + err);
                    // fallback: still show results
                    TransitionTo(GameState.Results);
                    SceneManager.LoadScene(resultsScene);
                }));
            },
            (err) => Debug.LogError("FinishMatch: " + err)
        );
    }

    // ── Utilitaires ───────────────────────────────────────────────

    private void TransitionTo(GameState next)
    {
        Debug.Log($"[GameManager] {CurrentState} -> {next}");
        CurrentState = next;
    }
}
