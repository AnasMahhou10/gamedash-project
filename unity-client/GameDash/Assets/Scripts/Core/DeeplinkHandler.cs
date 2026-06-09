using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// DeeplinkHandler — gère 2 deeplinks :
///   gamedash://testmap?map_id=42&token=xxx  → ouvre MapTest avec la map
///   gamedash://editor?token=xxx             → ouvre MapEditor directement
///
/// À attacher sur le GameObject "GameDash" (même que ApiManager + GameManager).
/// </summary>
public class DeeplinkHandler : MonoBehaviour
{
    [Header("Scènes")]
    public string mapTestScene   = "MapTest";
    public string mapEditorScene = "MapEditor";
    public string loginScene     = "Login";

    void Start()
    {
        Application.deepLinkActivated += OnDeepLinkActivated;

        if (!string.IsNullOrEmpty(Application.absoluteURL))
        {
            OnDeepLinkActivated(Application.absoluteURL);
            return;
        }

        ParseCommandLineArgs();
    }

    void OnDestroy()
    {
        Application.deepLinkActivated -= OnDeepLinkActivated;
    }

    private void OnDeepLinkActivated(string url)
    {
        if (string.IsNullOrEmpty(url))
        {
            return;
        }

        if (url.StartsWith("gamedash://testmap", StringComparison.OrdinalIgnoreCase))
        {
            Debug.Log("[Deeplink] TestMap détecté : " + url);
            HandleTestMapDeeplink(url);
            return;
        }

        if (url.StartsWith("gamedash://match", StringComparison.OrdinalIgnoreCase))
        {
            Debug.Log("[Deeplink] Match détecté : " + url);
            HandleMatchDeeplink(url);
            return;
        }

        if (url.StartsWith("gamedash://queue", StringComparison.OrdinalIgnoreCase))
        {
            Debug.Log("[Deeplink] Queue détectée : " + url);
            HandleQueueDeeplink(url);
            return;
        }

        if (url.StartsWith("gamedash://editor", StringComparison.OrdinalIgnoreCase))
        {
            Debug.Log("[Deeplink] Editor détecté : " + url);
            HandleEditorDeeplink(url);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Lecture des arguments de lancement
    // ──────────────────────────────────────────────────────────────

    private void ParseCommandLineArgs()
    {
        string[] args = Environment.GetCommandLineArgs();

        foreach (string arg in args)
        {
            // Deeplink test de map
            if (arg.StartsWith("gamedash://testmap", StringComparison.OrdinalIgnoreCase))
            {
                Debug.Log("[Deeplink] TestMap détecté : " + arg);
                HandleTestMapDeeplink(arg);
                return;
            }

            if (arg.StartsWith("gamedash://match", StringComparison.OrdinalIgnoreCase))
            {
                Debug.Log("[Deeplink] Match détecté : " + arg);
                HandleMatchDeeplink(arg);
                return;
            }

            if (arg.StartsWith("gamedash://queue", StringComparison.OrdinalIgnoreCase))
            {
                Debug.Log("[Deeplink] Queue détectée : " + arg);
                HandleQueueDeeplink(arg);
                return;
            }

            // Deeplink éditeur de maps
            if (arg.StartsWith("gamedash://editor", StringComparison.OrdinalIgnoreCase))
            {
                Debug.Log("[Deeplink] Editor détecté : " + arg);
                HandleEditorDeeplink(arg);
                return;
            }
        }

        // Aucun deeplink → flux normal (Login)
        Debug.Log("[Deeplink] Aucun deeplink, démarrage normal.");
    }

    // ──────────────────────────────────────────────────────────────
    // Deeplink : tester une map
    // gamedash://testmap?map_id=42&token=xxx
    // ──────────────────────────────────────────────────────────────

    private void HandleTestMapDeeplink(string url)
    {
        var query = ParseQuery(url);

        int mapId = 0;
        if (query.TryGetValue("map_id", out string mapIdStr))
        {
            int.TryParse(mapIdStr, out mapId);
        }

        if (!query.TryGetValue("token", out string token) || string.IsNullOrEmpty(token))
        {
            Debug.LogError("[Deeplink] token manquant dans : " + url);
            Application.Quit();
            return;
        }

        ApiManager.Instance.InjectToken(token);
        StartCoroutine(LoadProfileThenMap(mapId));
    }

    private IEnumerator LoadProfileThenMap(int mapId)
    {
        // 1. Charger le profil
        bool ok = false;
        int expectedPlayerId = 0;
        yield return ApiManager.Instance.GetMe(
            (profile) =>
            {
                if (expectedPlayerId > 0 && profile.id != expectedPlayerId)
                {
                    Debug.LogError($"[Deeplink] Mauvais joueur: attendu {expectedPlayerId}, reçu {profile.id}");
                    return;
                }

                GameManager.Instance.SetLocalPlayer(profile);
                ok = true;
            },
            (err)     => Debug.LogError("[Deeplink] GetMe échoué : " + err)
        );

        if (!ok) { Application.Quit(); yield break; }

        // 2. Charger la map
        yield return ApiManager.Instance.GetMap(mapId,
            (mapResp) =>
            {
                MapData mapData = null;
                try
                {
                    if (!string.IsNullOrEmpty(mapResp.content_url))
                        mapData = MapData.FromBase64(mapResp.content_url);
                }
                catch (Exception e)
                {
                    Debug.LogWarning("[Deeplink] Décodage map échoué : " + e.Message);
                }

                MapTestController.PendingMap      = mapData;
                MapTestController.PendingMapId    = mapId;
                MapTestController.PendingMapTitle = mapResp.title;

                SceneManager.LoadScene(mapTestScene);
            },
            (err) =>
            {
                Debug.LogError("[Deeplink] GetMap échoué : " + err);
                Application.Quit();
            }
        );
    }

    private void HandleMatchDeeplink(string url)
    {
        var query = ParseQuery(url);

        if (!query.TryGetValue("match_id", out string matchIdStr) ||
            !int.TryParse(matchIdStr, out int matchId))
        {
            Debug.LogError("[Deeplink] match_id manquant dans : " + url);
            Application.Quit();
            return;
        }

        int mapId = 0;
        if (query.TryGetValue("map_id", out string mapIdStr))
        {
            int.TryParse(mapIdStr, out mapId);
        }

        if (!query.TryGetValue("opponent", out string opponentStr) ||
            !int.TryParse(opponentStr, out int opponentId))
        {
            Debug.LogError("[Deeplink] opponent manquant dans : " + url);
            Application.Quit();
            return;
        }

        if (!query.TryGetValue("token", out string token) || string.IsNullOrEmpty(token))
        {
            Debug.LogError("[Deeplink] token manquant dans : " + url);
            Application.Quit();
            return;
        }

        query.TryGetValue("mode", out string mode);
        int expectedPlayerId = 0;
        if (query.TryGetValue("player_id", out string playerIdStr))
        {
            int.TryParse(playerIdStr, out expectedPlayerId);
        }

        ApiManager.Instance.InjectToken(token);
        StartCoroutine(LoadProfileThenMatch(matchId, opponentId, mode, mapId, expectedPlayerId));
    }

    private void HandleQueueDeeplink(string url)
    {
        var query = ParseQuery(url);

        if (!query.TryGetValue("token", out string token) || string.IsNullOrEmpty(token))
        {
            Debug.LogError("[Deeplink] token manquant dans : " + url);
            Application.Quit();
            return;
        }

        query.TryGetValue("mode", out string mode);
        if (string.IsNullOrEmpty(mode))
        {
            mode = "ranked";
        }

        ApiManager.Instance.InjectToken(token);
        StartCoroutine(LoadProfileThenQueue(mode));
    }

    private IEnumerator LoadProfileThenQueue(string mode)
    {
        bool ok = false;
        yield return ApiManager.Instance.GetMe(
            (profile) => { GameManager.Instance.SetLocalPlayer(profile); ok = true; },
            (err)     => Debug.LogError("[Deeplink] GetMe échoué : " + err)
        );

        if (!ok) { Application.Quit(); yield break; }

        GameManager.Instance.StartMatchmaking(mode);
    }

    private IEnumerator LoadProfileThenMatch(int matchId, int opponentId, string mode, int mapId, int expectedPlayerId = 0)
    {
        bool ok = false;
        yield return ApiManager.Instance.GetMe(
            (profile) => { GameManager.Instance.SetLocalPlayer(profile); ok = true; },
            (err)     => Debug.LogError("[Deeplink] GetMe échoué : " + err)
        );

        if (!ok) { Application.Quit(); yield break; }

        if (expectedPlayerId > 0 && GameManager.Instance.LocalPlayer.id != expectedPlayerId)
        {
            Debug.LogError($"[Deeplink] Mauvais joueur: attendu {expectedPlayerId}, reçu {GameManager.Instance.LocalPlayer.id}");
            Application.Quit();
            yield break;
        }

        GameManager.Instance.StartMatchFromDeeplink(matchId, opponentId, mode, mapId);
    }

    // ──────────────────────────────────────────────────────────────
    // Deeplink : ouvrir l'éditeur de maps
    // gamedash://editor?token=xxx
    // ──────────────────────────────────────────────────────────────

    private void HandleEditorDeeplink(string url)
    {
        var query = ParseQuery(url);

        if (!query.TryGetValue("token", out string token) || string.IsNullOrEmpty(token))
        {
            Debug.LogError("[Deeplink] token manquant dans : " + url);
            Application.Quit();
            return;
        }

        ApiManager.Instance.InjectToken(token);
        StartCoroutine(LoadProfileThenEditor());
    }

    private IEnumerator LoadProfileThenEditor()
    {
        bool ok = false;
        yield return ApiManager.Instance.GetMe(
            (profile) => { GameManager.Instance.SetLocalPlayer(profile); ok = true; },
            (err)     => Debug.LogError("[Deeplink] GetMe échoué : " + err)
        );

        if (!ok) { Application.Quit(); yield break; }

        Debug.Log($"[Deeplink] Ouverture éditeur pour : {GameManager.Instance.LocalPlayer.pseudo}");
        SceneManager.LoadScene(mapEditorScene);
    }

   
    private static System.Collections.Generic.Dictionary<string, string> ParseQuery(string url)
    {
        var result = new System.Collections.Generic.Dictionary<string, string>(
            StringComparer.OrdinalIgnoreCase);

        int qIdx = url.IndexOf('?');
        if (qIdx < 0) return result;

        string queryString = url.Substring(qIdx + 1);
        foreach (string pair in queryString.Split('&'))
        {
            int eqIdx = pair.IndexOf('=');
            if (eqIdx < 0) continue;
            string key = Uri.UnescapeDataString(pair.Substring(0, eqIdx));
            string val = Uri.UnescapeDataString(pair.Substring(eqIdx + 1));
            result[key] = val;
        }
        return result;
    }
}
