using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class MultiplayerGameController : MonoBehaviour
{
    [Header("HUD")]
    public TMP_Text modeText;
    public TMP_Text statusText;
    public TMP_Text playerNameText;
    public TMP_Text opponentNameText;

    [Header("Panneau fin de partie")]
    public GameObject endPanel;
    public TMP_Text   endTitleText;
    public TMP_Text   endSubtitleText;
    public Button     returnMenuButton;

    [Header("Joueurs")]
    public GameObject playerObject;
    public GameObject opponentObject;
    public float      playerSpeed = 6f;

    [Header("Lissage réseau")]
    public float remoteInterpSpeed = 20f;

    private bool    _gameOver          = false;
    private bool    _gameStarted       = false;
    private int     _localId;
    private int     _opponentId;
    private int     _matchId;
    private Vector3 _remoteTargetPos;
    private bool    _remoteInitialized = false;
    private float   _sendInterval      = 0.05f;
    private float   _lastSendTime      = 0f;
    private Vector3 _goalPosition;
    private bool    _goalCreated       = false;

    private HashSet<Vector2Int> _wallPositions = new HashSet<Vector2Int>();
    private const float PLAYER_RADIUS = 0.28f;

    void Start()
    {
        Screen.SetResolution(960, 720, false); 

        _localId    = GameManager.Instance.LocalPlayer.id;
        _opponentId = GameManager.Instance.CurrentOpponentId;
        _matchId    = GameManager.Instance.CurrentMatchId;

        if (playerNameText   != null) playerNameText.text   = GameManager.Instance.LocalPlayer.pseudo;
        if (opponentNameText != null) opponentNameText.text = $"Joueur {_opponentId}";

        StartCoroutine(FetchOpponentName());

        string modeLabel = GameManager.Instance.CurrentMode?.ToUpper() switch
        {
            "RANKED"   => "RANKED",
            "UNRANKED" => "UNRANKED",
            "FUN"      => "FUN",
            var m      => m ?? "—"
        };
        if (modeText != null) modeText.text = modeLabel;

        if (MapTestController.PendingMap != null)
            BuildMap(MapTestController.PendingMap);
        else
            BuildDefaultMap();

        endPanel?.SetActive(false);
        returnMenuButton?.onClick.AddListener(OnReturnMenu);

        _remoteTargetPos = opponentObject.transform.position;
        StartCoroutine(ConnectAndStartGame());
    }

    private IEnumerator FetchOpponentName()
    {
        yield return ApiManager.Instance.GetUserPseudo(
            _opponentId,
            (pseudo) => { if (opponentNameText != null) opponentNameText.text = pseudo; },
            (err)    => Debug.LogWarning($"[Game] GetUserPseudo: {err}")
        );
    }

    private IEnumerator ConnectAndStartGame()
    {
        if (statusText != null) statusText.text = "Connexion...";
        yield return GameWebSocketClient.Instance.ConnectGameWS(_matchId);

        GameWebSocketClient.OnOpponentMoved        += OnOpponentMoved;
        GameWebSocketClient.OnOpponentDisconnected += OnOpponentDisconnected;
        GameWebSocketClient.OnGameOver             += OnGameOverReceived;

        if (statusText != null) statusText.text = "FONCE VERS LA ZONE D'ARRIVÉE !";
        yield return new WaitForSeconds(2f);
        if (statusText != null) statusText.text = "";

        _gameStarted = true;
    }

    void OnDestroy()
    {
        UnsubscribeAll();
        GameWebSocketClient.Instance?.DisconnectGameWS();
    }

    void Update()
    {
        if (_gameOver || !_gameStarted) return;

        InterpolateOpponent();

        bool arrowPressed = Input.GetKey(KeyCode.LeftArrow)  ||
                            Input.GetKey(KeyCode.RightArrow) ||
                            Input.GetKey(KeyCode.UpArrow)    ||
                            Input.GetKey(KeyCode.DownArrow);

        if (Input.anyKey && !arrowPressed) return;

        HandleLocalInput();
        CheckGoalReached();
    }

    private void HandleLocalInput()
    {
        float h = 0f, v = 0f;

        if (Input.GetKey(KeyCode.LeftArrow))  h = -1f;
        if (Input.GetKey(KeyCode.RightArrow)) h =  1f;
        if (Input.GetKey(KeyCode.UpArrow))    v =  1f;
        if (Input.GetKey(KeyCode.DownArrow))  v = -1f;

        if (h != 0f || v != 0f)
        {
            Vector3 delta = new Vector3(h, v, 0f) * playerSpeed * Time.deltaTime;
            Vector3 currentPos = playerObject.transform.position;

            Vector3 tryX = currentPos + new Vector3(delta.x, 0f, 0f);
            if (!IsBlockedByWall(tryX))
                currentPos = tryX;

            Vector3 tryY = currentPos + new Vector3(0f, delta.y, 0f);
            if (!IsBlockedByWall(tryY))
                currentPos = tryY;

            playerObject.transform.position = currentPos;
        }

        if (Time.time - _lastSendTime >= _sendInterval)
        {
            _lastSendTime = Time.time;
            var pos = playerObject.transform.position;
            GameWebSocketClient.Instance?.SendMove(pos.x, pos.y);
        }
    }

    private bool IsBlockedByWall(Vector3 pos)
    {
        if (_wallPositions.Count == 0) return false;

        int minX = Mathf.FloorToInt(pos.x - PLAYER_RADIUS);
        int maxX = Mathf.CeilToInt(pos.x + PLAYER_RADIUS);
        int minY = Mathf.FloorToInt(pos.y - PLAYER_RADIUS);
        int maxY = Mathf.CeilToInt(pos.y + PLAYER_RADIUS);

        for (int x = minX; x <= maxX; x++)
        {
            for (int y = minY; y <= maxY; y++)
            {
                if (!_wallPositions.Contains(new Vector2Int(x, y))) continue;

                float closestX = Mathf.Clamp(pos.x, x - 0.5f, x + 0.5f);
                float closestY = Mathf.Clamp(pos.y, y - 0.5f, y + 0.5f);

                float distX = pos.x - closestX;
                float distY = pos.y - closestY;
                float distSq = distX * distX + distY * distY;

                if (distSq < (PLAYER_RADIUS * PLAYER_RADIUS))
                    return true;
            }
        }

        return false;
    }

    private void InterpolateOpponent()
    {
        if (!_remoteInitialized) return;
        opponentObject.transform.position = remoteInterpSpeed <= 0f
            ? _remoteTargetPos
            : Vector3.Lerp(
                opponentObject.transform.position,
                _remoteTargetPos,
                remoteInterpSpeed * Time.deltaTime);
    }

    private void CheckGoalReached()
    {
        if (!_goalCreated) return;
        if (Vector3.Distance(playerObject.transform.position, _goalPosition) < 0.8f)
            EndGame(_localId);
    }

    private void OnOpponentMoved(float x, float y)
    {
        _remoteTargetPos   = new Vector3(x, y, 0f);
        _remoteInitialized = true;
    }

    private void OnOpponentDisconnected()
    {
        if (_gameOver) return;
        _gameOver = true;
        UnsubscribeAll();
        ShowEndPanel("VICTOIRE", "L'adversaire a quitté la partie.");
        GameManager.Instance.ReportMatchEnd(_localId);
    }

    private void OnGameOverReceived(int winnerId)
    {
        if (_gameOver) return;
        _gameOver = true;
        UnsubscribeAll();

        bool won = (winnerId == _localId);
        GameManager.Instance.SetPlayerWon(won);
        GameManager.Instance.SetLastMatchResult(new FinishMatchResponse
        {
            message      = won ? "Victoire" : "Défaite",
            mmr_change   = 0,
            xp_gained    = 0,
            coins_gained = 0,
        });

        ShowEndPanel(
            won ? "VICTOIRE" : "DÉFAITE",
            won ? "Tu as atteint l'arrivée en premier !"
                : "L'adversaire est arrivé avant toi.");

        StartCoroutine(GoToResultsAfterDelay(2f));
    }

    private IEnumerator GoToResultsAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        GameWebSocketClient.Instance?.DisconnectGameWS();
        GameManager.Instance.GoToResultsDirectly();
    }

    private void OnReturnMenu() => GameManager.Instance.GoToLobby();

    private void EndGame(int winnerId)
    {
        if (_gameOver) return;
        _gameOver = true;
        UnsubscribeAll();

        GameWebSocketClient.Instance?.SendGameOver(winnerId);

        bool won = (winnerId == _localId);
        GameManager.Instance.SetPlayerWon(won);

        ShowEndPanel(
            won ? "VICTOIRE" : "DÉFAITE",
            won ? "Tu as atteint l'arrivée en premier !"
                : "L'adversaire est arrivé avant toi.");

        StartCoroutine(DisconnectAndReport(winnerId));
    }

    private IEnumerator DisconnectAndReport(int winnerId)
    {
        yield return null;
        yield return null;
        GameWebSocketClient.Instance?.DisconnectGameWS();
        GameManager.Instance.ReportMatchEnd(winnerId);
    }

    private void UnsubscribeAll()
    {
        GameWebSocketClient.OnOpponentMoved        -= OnOpponentMoved;
        GameWebSocketClient.OnOpponentDisconnected -= OnOpponentDisconnected;
        GameWebSocketClient.OnGameOver             -= OnGameOverReceived;
    }

    private void ShowEndPanel(string title, string subtitle)
    {
        if (endPanel        != null) endPanel.SetActive(true);
        if (endTitleText    != null) endTitleText.text    = title;
        if (endSubtitleText != null) endSubtitleText.text = subtitle;
    }

    // ── MAP ───────────────────────────────────────────────────────
    private void BuildMap(MapData data)
    {
        if (data == null) return;
        var root = new GameObject("MapRoot");

        // ── Caméra adaptée à la taille réelle de la fenêtre ──────
        float mapWidth     = data.width;
        float mapHeight    = data.height;
        float screenAspect = (float)Screen.width / Screen.height;
        float sizeByHeight = mapHeight * 0.5f;
        float sizeByWidth  = (mapWidth * 0.5f) / screenAspect;

        Camera.main.orthographicSize   = Mathf.Max(sizeByHeight, sizeByWidth) + 0.5f;
        Camera.main.transform.position = new Vector3(mapWidth * 0.5f, mapHeight * 0.5f, -10f);
        Camera.main.backgroundColor    = new Color(0.08f, 0.08f, 0.12f);

        _wallPositions.Clear();

        var overrideCells = new HashSet<Vector2Int>();
        foreach (var cell in data.cells)
        {
            if (cell.type == 3 || cell.type == 4 || cell.type == 5)
                overrideCells.Add(new Vector2Int(cell.x, cell.y));
        }

        foreach (var cell in data.cells)
        {
            var go = MakeTile(cell.type, cell.x, cell.y);
            if (go == null) continue;
            go.transform.SetParent(root.transform);
            go.name = $"t_{cell.x}_{cell.y}";

            if (cell.type == 1)
            {
                var coord = new Vector2Int(cell.x, cell.y);
                if (!overrideCells.Contains(coord))
                    _wallPositions.Add(coord);
            }

            if (cell.type == 5)
            {
                _goalPosition = new Vector3(cell.x, cell.y, 0f);
                _goalCreated  = true;
                StartCoroutine(BlinkGoal(go));
            }
        }

        PlacePlayersOnSpawns(data);
    }

    private void PlacePlayersOnSpawns(MapData data)
    {
        Vector3? spawnP1 = null, spawnP2 = null;

        foreach (var cell in data.cells)
        {
            if (cell.type == 3) spawnP1 = new Vector3(cell.x, cell.y, 0f);
            if (cell.type == 4) spawnP2 = new Vector3(cell.x, cell.y, 0f);
        }

        bool isPlayer1 = (_localId < _opponentId);

        if (isPlayer1)
        {
            if (spawnP1.HasValue) playerObject.transform.position   = spawnP1.Value;
            if (spawnP2.HasValue) opponentObject.transform.position = spawnP2.Value;
        }
        else
        {
            if (spawnP2.HasValue) playerObject.transform.position   = spawnP2.Value;
            if (spawnP1.HasValue) opponentObject.transform.position = spawnP1.Value;
        }

        _remoteTargetPos = opponentObject.transform.position;
    }

    private void BuildDefaultMap()
    {
        var d = new MapData("Default", "", 16, 12);

        for (int x = 0; x < 16; x++)
        {
            d.cells.Add(new MapCell { x = x, y = 0,  type = 1 });
            d.cells.Add(new MapCell { x = x, y = 11, type = 1 });
        }
        for (int y = 1; y < 11; y++)
        {
            d.cells.Add(new MapCell { x = 0,  y = y, type = 1 });
            d.cells.Add(new MapCell { x = 15, y = y, type = 1 });
        }
        for (int y = 1; y < 11; y++)
            for (int x = 1; x < 15; x++)
                d.cells.Add(new MapCell { x = x, y = y, type = 2 });

        for (int y = 3; y < 9; y++) d.cells.Add(new MapCell { x = 5,  y = y, type = 1 });
        for (int y = 3; y < 9; y++) d.cells.Add(new MapCell { x = 10, y = y, type = 1 });
        for (int x = 5; x < 11; x++) d.cells.Add(new MapCell { x = x, y = 6, type = 1 });

        d.cells.Add(new MapCell { x = 2,  y = 2, type = 3 });
        d.cells.Add(new MapCell { x = 13, y = 9, type = 4 });
        d.cells.Add(new MapCell { x = 7,  y = 9, type = 5 });

        BuildMap(d);
    }

    private static GameObject MakeTile(int type, int x, int y)
    {
        Color[] palette =
        {
            Color.clear,
            new Color(0.30f, 0.18f, 0.08f),
            new Color(0.13f, 0.55f, 0.18f),
            new Color(0.10f, 0.45f, 0.90f),
            new Color(0.90f, 0.18f, 0.18f),
            new Color(1.00f, 0.85f, 0.00f),
        };
        if (type <= 0 || type >= palette.Length) return null;

        var go = new GameObject($"tile_{type}_{x}_{y}");
        var sr = go.AddComponent<SpriteRenderer>();
        sr.color        = palette[type];
        sr.sortingOrder = type == 5 ? 2 : 0;

        var tex = new Texture2D(32, 32);
        var px  = new Color[1024];
        for (int i = 0; i < px.Length; i++) px[i] = Color.white;
        tex.SetPixels(px); tex.Apply();
        sr.sprite = Sprite.Create(tex, new Rect(0, 0, 32, 32), Vector2.one * 0.5f, 32);
        go.transform.position = new Vector3(x, y, 0f);
        return go;
    }

    private IEnumerator BlinkGoal(GameObject go)
    {
        var sr = go.GetComponent<SpriteRenderer>();
        if (sr == null) yield break;

        Color baseColor = new Color(1f, 0.85f, 0f);
        Color dimColor  = new Color(1f, 0.85f, 0f, 0.3f);

        while (!_gameOver)
        {
            sr.color = baseColor;
            yield return new WaitForSeconds(0.4f);
            sr.color = dimColor;
            yield return new WaitForSeconds(0.4f);
        }
        sr.color = baseColor;
    }
}