using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class ApiManager : MonoBehaviour
{
    public static ApiManager Instance { get; private set; }

    [Header("Configuration")]
    [Tooltip("URL de base du backend FastAPI, ex: http://127.0.0.1:8000")]
    public string baseUrl = "http://127.0.0.1:8000";

    private string _token;
    public bool IsAuthenticated => !string.IsNullOrEmpty(_token);

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        _token = GetLaunchToken();

        if (string.IsNullOrEmpty(_token))
        {
            _token = PlayerPrefs.GetString("jwt_token", "");
        }
    }

    // ── AUTH ──────────────────────────────────────────────────────

    public IEnumerator Login(string email, string password,
        Action<LoginResponse> onSuccess, Action<string> onError)
    {
        var body = JsonUtility.ToJson(new LoginRequest { email = email, password = password });
        yield return Post("/auth/login", body, false, (json) =>
        {
            var resp = JsonUtility.FromJson<LoginResponse>(json);
            _token = resp.access_token;
            PlayerPrefs.SetString("jwt_token", _token);
            PlayerPrefs.Save();
            onSuccess?.Invoke(resp);
        }, onError);
    }

    public IEnumerator GetMe(Action<UserProfile> onSuccess, Action<string> onError)
    {
        yield return Get("/auth/me", (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<UserProfile>(json));
        }, onError);
    }

    public void Logout()
    {
        _token = "";
        PlayerPrefs.DeleteKey("jwt_token");
        PlayerPrefs.Save();
    }

    /// <summary>Injecte un token JWT directement (utilisé par le deeplink).</summary>
    public void InjectToken(string token)
    {
        _token = token;
        Debug.Log("[ApiManager] Token injecté via deeplink pour cette fenêtre.");
    }

    private string GetLaunchToken()
    {
        string token = ExtractTokenFromUrl(Application.absoluteURL);

        if (!string.IsNullOrEmpty(token))
        {
            return token;
        }

        foreach (string arg in Environment.GetCommandLineArgs())
        {
            token = ExtractTokenFromUrl(arg);

            if (!string.IsNullOrEmpty(token))
            {
                return token;
            }
        }

        return "";
    }

    private string ExtractTokenFromUrl(string url)
    {
        if (string.IsNullOrEmpty(url) ||
            !url.StartsWith("gamedash://", StringComparison.OrdinalIgnoreCase))
        {
            return "";
        }

        int qIdx = url.IndexOf('?');
        if (qIdx < 0) return "";

        string queryString = url.Substring(qIdx + 1);
        foreach (string pair in queryString.Split('&'))
        {
            int eqIdx = pair.IndexOf('=');
            if (eqIdx < 0) continue;

            string key = Uri.UnescapeDataString(pair.Substring(0, eqIdx));
            if (!key.Equals("token", StringComparison.OrdinalIgnoreCase)) continue;

            return Uri.UnescapeDataString(pair.Substring(eqIdx + 1));
        }

        return "";
    }

    // ── MATCHMAKING ───────────────────────────────────────────────

    public IEnumerator JoinQueue(string mode,
        Action<QueueResponse> onSuccess, Action<string> onError)
    {
        var body = JsonUtility.ToJson(new JoinQueueRequest { mode = mode });
        yield return Post("/matchmaking/join", body, true, (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<QueueResponse>(json));
        }, onError);
    }

    public IEnumerator LeaveQueue(Action onSuccess, Action<string> onError)
    {
        yield return Post("/matchmaking/leave", "{}", true, (_) => onSuccess?.Invoke(), onError);
    }

    public IEnumerator GetCurrentMatch(Action<CurrentMatchResponse> onSuccess, Action<string> onError)
    {
        yield return Get("/matchmaking/current", (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<CurrentMatchResponse>(json));
        }, onError);
    }

    public IEnumerator PostMatchResult(int matchId, int winnerId,
        Action onSuccess, Action<string> onError)
    {
        string url = $"/matchmaking/result?match_id={matchId}&winner_id={winnerId}";
        yield return Post(url, "", true, (_) => onSuccess?.Invoke(), onError);
    }

    public IEnumerator FinishMatch(int matchId, int winnerId,
        Action<FinishMatchResponse> onSuccess, Action<string> onError)
    {
        string url = $"/matchmaking/finish?match_id={matchId}&winner_id={winnerId}";
        yield return Post(url, "", true, (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<FinishMatchResponse>(json));
        }, onError);
    }

    // ── MAPS UGC ──────────────────────────────────────────────────

    public IEnumerator CreateMap(CreateMapRequest payload,
        Action<CreateMapResponse> onSuccess, Action<string> onError)
    {
        string body = JsonUtility.ToJson(payload);
        yield return Post("/maps/", body, true, (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<CreateMapResponse>(json));
        }, onError);
    }

    public IEnumerator AddMapVersion(AddVersionRequest payload,
        Action<AddVersionResponse> onSuccess, Action<string> onError)
    {
        string body = JsonUtility.ToJson(payload);
        yield return Post("/maps/version", body, true, (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<AddVersionResponse>(json));
        }, onError);
    }

    public IEnumerator MarkMapTest(int mapId, int durationSeconds, float completionRate,
        Action onSuccess, Action<string> onError)
    {
        var payload = new MapTestRequest
        {
            map_id = mapId,
            duration_seconds = durationSeconds,
            completion_rate = completionRate
        };
        string body = JsonUtility.ToJson(payload);
        yield return Post("/maps/test", body, true, (_) => onSuccess?.Invoke(), onError);
    }

    /// <summary>Récupère une map par son ID (utilisé par le deeplink).</summary>
    public IEnumerator GetMap(int mapId, Action<MapResponse> onSuccess, Action<string> onError)
    {
        yield return Get($"/maps/{mapId}", (json) =>
        {
            onSuccess?.Invoke(JsonUtility.FromJson<MapResponse>(json));
        }, onError);
    }

    // ── HTTP helpers ──────────────────────────────────────────────

    private IEnumerator Get(string path, Action<string> onSuccess, Action<string> onError)
    {
        using var req = UnityWebRequest.Get(baseUrl + path);
        req.SetRequestHeader("Content-Type", "application/json");
        if (!string.IsNullOrEmpty(_token))
            req.SetRequestHeader("Authorization", "Bearer " + _token);
        yield return req.SendWebRequest();
        if (req.result == UnityWebRequest.Result.Success)
            onSuccess?.Invoke(req.downloadHandler.text);
        else
            onError?.Invoke($"GET {path} -> {req.responseCode}: {req.downloadHandler.text}");
    }

    private IEnumerator Post(string path, string jsonBody, bool auth,
        Action<string> onSuccess, Action<string> onError)
    {
        var bodyBytes = Encoding.UTF8.GetBytes(jsonBody);
        using var req = new UnityWebRequest(baseUrl + path, "POST");
        req.uploadHandler   = new UploadHandlerRaw(bodyBytes);
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        if (auth && !string.IsNullOrEmpty(_token))
            req.SetRequestHeader("Authorization", "Bearer " + _token);
        yield return req.SendWebRequest();
        if (req.result == UnityWebRequest.Result.Success)
            onSuccess?.Invoke(req.downloadHandler.text);
        else
            onError?.Invoke($"POST {path} -> {req.responseCode}: {req.downloadHandler.text}");
    }
}

// ── DTOs ──────────────────────────────────────────────────────────

[Serializable] public class LoginRequest  { public string email; public string password; }
[Serializable] public class LoginResponse { public string access_token; public string token_type; }

[Serializable]
public class UserProfile
{
    public int    id;
    public string pseudo;
    public string email;
    public string role;
    public int    elo;
    public int    ranked_elo;
    public int    level;
    public int    xp;
    public string status;
    public int    soft_currency;
    public int    hard_currency;
}

[Serializable] public class JoinQueueRequest { public string mode; }
[Serializable] public class QueueResponse    { public string message; public string status; }

[Serializable]
public class CurrentMatchResponse
{
    public bool      in_match;
    public MatchData match;
}

[Serializable]
public class MatchData
{
    public int    match_id;
    public int    opponent;
    public string mode;
    public string status;
    public int    map_id;
}

[Serializable]
public class FinishMatchResponse
{
    public string message;
    public int    mmr_change;
    public int    xp_gained;
    public int    coins_gained;
}

[Serializable]
public class CreateMapRequest
{
    public string   title;
    public string   description;
    public string   status;
    public string   content_url;
    public string[] tags;
    public string[] screenshot_urls;
}

[Serializable] public class CreateMapResponse  { public string message; public int map_id; }

[Serializable]
public class AddVersionRequest
{
    public int      map_id;
    public string   notes;
    public string   content_url;
    public string[] screenshot_urls;
}

[Serializable] public class AddVersionResponse { public string message; public string version; }

[Serializable]
public class MapTestRequest
{
    public int   map_id;
    public int   duration_seconds;
    public float completion_rate;
}

[Serializable]
public class MapResponse
{
    public int    id;
    public string title;
    public string description;
    public string status;
    public string content_url;
    public int    tests_count;
    public int    favorites;
}
