using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Lobby principal : affiche les infos du joueur et les boutons pour rejoindre une file.
/// </summary>
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
    public Button mapEditorButton;

    [Header("Status")]
    public TMP_Text statusText;

    void Start()
    {
        // Affiche les infos du joueur connecté
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
        mapEditorButton.onClick.AddListener(() => GameManager.Instance.GoToMapEditor());

        statusText.text = "";
    }

    private void JoinQueue(string mode)
    {
        statusText.text = $"Recherche de match ({mode})...";
        SetButtonsInteractable(false);
        GameManager.Instance.StartMatchmaking(mode);
    }

    private void SetButtonsInteractable(bool v)
    {
        rankedButton.interactable   = v;
        unrankedButton.interactable = v;
        funButton.interactable      = v;
    }
}
