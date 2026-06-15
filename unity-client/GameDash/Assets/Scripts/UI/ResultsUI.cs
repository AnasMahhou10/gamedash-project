using TMPro;
using UnityEngine;
using UnityEngine.UI;





public class ResultsUI : MonoBehaviour
{
    [Header("Textes résultats")]
    public TMP_Text resultTitle;
    public TMP_Text mmrChangeText;
    public TMP_Text xpGainedText;
    public TMP_Text coinsGainedText;
    public TMP_Text modeText;

    [Header("Bouton retour")]
    public Button backToLobbyButton;

    void Start()
    {
        backToLobbyButton.onClick.AddListener(GameManager.Instance.GoToLobby);

        bool won = GameManager.Instance.PlayerWon;
        var  res = GameManager.Instance.LastMatchResult;

        resultTitle.text = won ? "🏆 VICTOIRE" : "💀 DÉFAITE";
        resultTitle.color = won ? Color.green : Color.red;

        modeText.text = $"Mode : {GameManager.Instance.CurrentMode?.ToUpper() ?? "—"}";

        if (res != null)
        {
            string sign = res.mmr_change >= 0 ? "+" : "";
            mmrChangeText.text  = $"MMR : {sign}{res.mmr_change}";
            xpGainedText.text   = $"XP  : +{res.xp_gained}";
            coinsGainedText.text = $"Coins : +{res.coins_gained}";
        }
        else
        {
            mmrChangeText.text   = "MMR : —";
            xpGainedText.text    = "XP  : —";
            coinsGainedText.text = "Coins : —";
        }
    }
}
