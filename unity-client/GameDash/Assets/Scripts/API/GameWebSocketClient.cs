using System;
using System.Collections;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

public class GameWebSocketClient : MonoBehaviour
{
    public static GameWebSocketClient Instance { get; private set; }

    public static event Action<int>          OnOnlineCountUpdated;
    public static event Action<float, float> OnOpponentMoved;
    public static event Action               OnOpponentDisconnected;
    public static event Action<int>          OnGameOver;

    [Header("WebSocket endpoints")]
    public string wsBaseUrl = "ws://127.0.0.1:8000";

    private ClientWebSocket         _lobbyWs;
    private ClientWebSocket         _gameWs;
    private CancellationTokenSource _lobbyCts;
    private CancellationTokenSource _gameCts;
    private bool _lobbyConnected = false;
    private bool _gameConnected  = false;
    private bool _iSentGameOver  = false;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void OnDestroy()
    {
        DisconnectLobbyWS();
        DisconnectGameWS();
    }

    public IEnumerator ConnectLobbyWS()
    {
        if (_lobbyConnected) yield break;
        if (string.IsNullOrEmpty(ApiManager.Instance?.Token)) yield break;

        string url = $"{wsBaseUrl}/ws/matchmaking?token={ApiManager.Instance.Token}";
        _lobbyCts = new CancellationTokenSource();
        Task t = ConnectLobbyAsync(url);
        yield return new WaitUntil(() => t.IsCompleted);
    }

    private async Task ConnectLobbyAsync(string url)
    {
        try
        {
            _lobbyWs = new ClientWebSocket();
            await _lobbyWs.ConnectAsync(new Uri(url), _lobbyCts.Token);
            _lobbyConnected = true;
            _ = ReceiveLobbyLoop();
        }
        catch (Exception e) { Debug.LogWarning($"[WS-Lobby] {e.Message}"); }
    }

    private async Task ReceiveLobbyLoop()
    {
        var buffer = new byte[4096];
        try
        {
            while (_lobbyWs.State == WebSocketState.Open && !_lobbyCts.IsCancellationRequested)
            {
                var r = await _lobbyWs.ReceiveAsync(new ArraySegment<byte>(buffer), _lobbyCts.Token);
                if (r.MessageType == WebSocketMessageType.Close) break;
                ProcessLobbyMessage(Encoding.UTF8.GetString(buffer, 0, r.Count));
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception e) { Debug.LogWarning($"[WS-Lobby] {e.Message}"); }
        finally { _lobbyConnected = false; }
    }

    private void ProcessLobbyMessage(string json)
    {
        try
        {
            var msg = JsonUtility.FromJson<WsMessage>(json);
            if (msg.type == "stats")
            {
                var s = JsonUtility.FromJson<WsStatsMessage>(json);
                MainThreadDispatcher.Enqueue(() => OnOnlineCountUpdated?.Invoke(s.players));
            }
        }
        catch { }
    }

    public void DisconnectLobbyWS()
    {
        _lobbyCts?.Cancel();
        _lobbyWs?.Abort();
        _lobbyConnected = false;
    }

    public IEnumerator ConnectGameWS(int matchId)
    {
        if (_gameConnected) yield break;
        if (string.IsNullOrEmpty(ApiManager.Instance?.Token)) yield break;

        
        _iSentGameOver = false;
        string url = $"{wsBaseUrl}/ws/game?token={ApiManager.Instance.Token}&match_id={matchId}";
        _gameCts = new CancellationTokenSource();
        Task t = ConnectGameAsync(url);
        yield return new WaitUntil(() => t.IsCompleted);
    }

    private async Task ConnectGameAsync(string url)
    {
        try
        {
            _gameWs = new ClientWebSocket();
            await _gameWs.ConnectAsync(new Uri(url), _gameCts.Token);
            _gameConnected = true;
            Debug.Log("[WS-Game] Connecté");
            _ = ReceiveGameLoop();
        }
        catch (Exception e) { Debug.LogWarning($"[WS-Game] {e.Message}"); }
    }

    private async Task ReceiveGameLoop()
    {
        var buffer = new byte[2048];
        try
        {
            while (_gameWs.State == WebSocketState.Open && !_gameCts.IsCancellationRequested)
            {
                var r = await _gameWs.ReceiveAsync(new ArraySegment<byte>(buffer), _gameCts.Token);
                if (r.MessageType == WebSocketMessageType.Close) break;
                ProcessGameMessage(Encoding.UTF8.GetString(buffer, 0, r.Count));
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception e) { Debug.LogWarning($"[WS-Game] {e.Message}"); }
        finally { _gameConnected = false; }
    }

    private void ProcessGameMessage(string json)
    {
        try
        {
            var msg = JsonUtility.FromJson<WsMessage>(json);
            switch (msg.type)
            {
                case "opponent_move":
                    var mv = JsonUtility.FromJson<WsMoveMessage>(json);
                    MainThreadDispatcher.Enqueue(() => OnOpponentMoved?.Invoke(mv.x, mv.y));
                    break;

                case "opponent_disconnected":
                    MainThreadDispatcher.Enqueue(() => OnOpponentDisconnected?.Invoke());
                    break;

                case "game_over":
                    if (_iSentGameOver)
                    {
                        Debug.Log("[WS-Game] game_over ignoré (c'est le nôtre)");
                        break;
                    }
                    var go = JsonUtility.FromJson<WsGameOverMessage>(json);
                    MainThreadDispatcher.Enqueue(() => OnGameOver?.Invoke(go.winner_id));
                    break;
            }
        }
        catch (Exception e) { Debug.LogWarning($"[WS-Game] Parse: {e.Message}"); }
    }

    public void SendMove(float x, float y)
    {
        if (!_gameConnected || _gameWs?.State != WebSocketState.Open) return;
        var bytes = Encoding.UTF8.GetBytes(
            JsonUtility.ToJson(new WsMoveMessage { type = "move", x = x, y = y }));
        _ = _gameWs.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _gameCts.Token);
    }

    public void SendGameOver(int winnerId)
    {
        if (!_gameConnected || _gameWs?.State != WebSocketState.Open) return;
        _iSentGameOver = true;
        var bytes = Encoding.UTF8.GetBytes(
            JsonUtility.ToJson(new WsGameOverMessage { type = "game_over", winner_id = winnerId }));
        _ = _gameWs.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _gameCts.Token);
        Debug.Log($"[WS-Game] SendGameOver winner={winnerId}");
    }

    public void DisconnectGameWS()
    {
        _gameCts?.Cancel();
        _gameWs?.Abort();
        _gameConnected = false;
        
        
    }

    [Serializable] private class WsMessage         { public string type; }
    [Serializable] private class WsStatsMessage    { public string type; public int players; }
    [Serializable] private class WsMoveMessage     { public string type; public float x; public float y; }
    [Serializable] public  class WsGameOverMessage { public string type; public int winner_id; }
}

public class MainThreadDispatcher : MonoBehaviour
{
    private static MainThreadDispatcher   _instance;
    private static readonly Queue<Action> _queue = new Queue<Action>();
    private static readonly object        _lock  = new object();

    public static void Enqueue(Action action)
    {
        lock (_lock) { _queue.Enqueue(action); }
    }

    void Awake()
    {
        if (_instance != null && _instance != this) { Destroy(gameObject); return; }
        _instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void Update()
    {
        lock (_lock)
        {
            while (_queue.Count > 0)
                _queue.Dequeue()?.Invoke();
        }
    }
}