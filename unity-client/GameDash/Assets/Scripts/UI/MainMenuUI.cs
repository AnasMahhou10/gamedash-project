using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;





public class MainMenuUI : MonoBehaviour
{
    [Header("Infos joueur")]
    public TMP_Text pseudoText;
    public TMP_Text levelText;
    public TMP_Text eloText;
    public TMP_Text coinsText;
    public TMP_Text onlineCountText;

    [Header("Boutons modes")]
    public Button rankedButton;
    public Button unrankedButton;
    public Button funButton;

    [Header("Labels des boutons (optionnel, pour animations)")]
    public TMP_Text rankedLabel;
    public TMP_Text unrankedLabel;
    public TMP_Text funLabel;

    [Header("Déconnexion")]
    public Button disconnectButton;

    [Header("Status")]
    public TMP_Text statusText;
    public GameObject statusPanel;

    [Header("Effets visuels")]
    public Animator menuAnimator;  

    private void Start()
    {
        RefreshPlayerInfo();

        rankedButton.onClick.AddListener(()   => OnModeSelected("ranked"));
        unrankedButton.onClick.AddListener(() => OnModeSelected("unranked"));
        funButton.onClick.AddListener(()      => OnModeSelected("fun"));
        disconnectButton.onClick.AddListener(OnDisconnect);

        SetStatus("");
        SetButtonsInteractable(true);

        
        StartCoroutine(GameWebSocketClient.Instance?.ConnectLobbyWS());
        GameWebSocketClient.OnOnlineCountUpdated += UpdateOnlineCount;
    }

    private void OnDestroy()
    {
        GameWebSocketClient.OnOnlineCountUpdated -= UpdateOnlineCount;
    }

    private void RefreshPlayerInfo()
    {
        var p = GameManager.Instance?.LocalPlayer;
        if (p == null) return;

        pseudoText.text  = p.pseudo;
        levelText.text   = $"LVL {p.level}";
        eloText.text     = $"MMR  {p.ranked_elo}";
        coinsText.text   = $"{p.soft_currency}";
    }

    private void UpdateOnlineCount(int count)
    {
        if (onlineCountText != null)
            onlineCountText.text = $"{count} en ligne";
    }

    

    private void OnModeSelected(string mode)
    {
        string label = mode switch
        {
            "ranked"   => "COMPÉTITIF",
            "unranked" => "NON-CLASSÉ",
            "fun"      => "ARCADE",
            _          => mode.ToUpper()
        };

        SetStatus($"Recherche d'adversaire — {label}...");
        SetButtonsInteractable(false);
        GameManager.Instance.StartMatchmaking(mode);
    }

    

    private void OnDisconnect()
    {
        SetButtonsInteractable(false);
        SetStatus("Déconnexion...");
        StartCoroutine(DoDisconnect());
    }

    private IEnumerator DoDisconnect()
    {
        
        yield return ApiManager.Instance.LeaveQueue(
            onSuccess: () => { },
            onError: (err) => Debug.LogWarning($"[MainMenu] LeaveQueue on disconnect: {err}")
        );

        
        GameWebSocketClient.Instance?.DisconnectLobbyWS();

        
        ApiManager.Instance.Logout();

        
        GameManager.Instance.GoToLogin();
    }

    

    private void SetButtonsInteractable(bool v)
    {
        rankedButton.interactable    = v;
        unrankedButton.interactable  = v;
        funButton.interactable       = v;
        disconnectButton.interactable = v;
    }

    private void SetStatus(string msg)
    {
        if (statusText  != null) statusText.text = msg;
        if (statusPanel != null) statusPanel.SetActive(!string.IsNullOrEmpty(msg));
    }
}
