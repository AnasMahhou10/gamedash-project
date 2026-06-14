using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class LobbyUI : MonoBehaviour
{
    [Header("Infos joueur")]
    public TMP_Text pseudoText;
    public TMP_Text levelText;
    public TMP_Text eloText;
    public TMP_Text coinsText;

    [Header("Boutons modes")]
    public Button rankedButton;
    public Button unrankedButton;
    public Button funButton;
    public Button disconnectButton;

    [Header("Status")]
    public TMP_Text statusText;

    void Start()
    {
        var p = GameManager.Instance.LocalPlayer;
        if (p != null)
        {
            pseudoText.text = p.pseudo;
            levelText.text  = $"Niveau {p.level}";
            eloText.text    = $"MMR Ranked : {p.ranked_elo}";
            coinsText.text  = $"Coins : {p.soft_currency}";
        }

        rankedButton.onClick.AddListener(  () => JoinQueue("ranked"));
        unrankedButton.onClick.AddListener(() => JoinQueue("unranked"));
        funButton.onClick.AddListener(     () => JoinQueue("fun"));
        disconnectButton.onClick.AddListener(OnDisconnect);

        statusText.text = "";
    }

    private void JoinQueue(string mode)
    {
        statusText.text = $"Recherche de match ({mode})...";
        SetButtonsInteractable(false);
        GameManager.Instance.StartMatchmaking(mode);
    }

    private void OnDisconnect()
    {
        SetButtonsInteractable(false);
        statusText.text = "Déconnexion...";
        StartCoroutine(DoDisconnect());
    }

    private IEnumerator DoDisconnect()
    {
        yield return ApiManager.Instance.LeaveQueue(
            onSuccess: () => { },
            onError: (err) => Debug.LogWarning($"LeaveQueue: {err}")
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
}