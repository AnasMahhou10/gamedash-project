using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;





public class QueueUI : MonoBehaviour
{
    [Header("UI")]
    public TMP_Text modeText;
    public TMP_Text waitTimeText;
    public TMP_Text searchingText;
    public TMP_Text tipText;
    public Button   cancelButton;

    [Header("Icône de chargement (optionnel)")]
    public RectTransform spinnerIcon;
    public float spinSpeed = 120f;

    private float _elapsed = 0f;
    private bool  _running = true;

    private static readonly string[] _modeTips = new[]
    {
        "Conseil : contrôle ton personnage avec les flèches directionnelles.",
        "Conseil : appuie sur Espace pour tirer.",
        "Conseil : le joueur avec le plus de vies gagne si le temps expire.",
        "Conseil : rester mobile rend la cible plus difficile à atteindre.",
        "Conseil : observe les déplacements de l'adversaire pour anticiper.",
    };

    void Start()
    {
        string modeLabel = GameManager.Instance.CurrentMode?.ToUpper() switch
        {
            "RANKED"   => "COMPÉTITIF",
            "UNRANKED" => "NON-CLASSÉ",
            "FUN"      => "ARCADE",
            var m      => m ?? "—"
        };
        if (modeText != null) modeText.text = modeLabel;

        
        if (tipText != null)
            tipText.text = _modeTips[Random.Range(0, _modeTips.Length)];

        cancelButton?.onClick.AddListener(OnCancel);
        StartCoroutine(AnimateSearching());
    }

    void Update()
    {
        if (!_running) return;

        _elapsed += Time.deltaTime;
        int m = (int)(_elapsed / 60);
        int s = (int)(_elapsed % 60);
        if (waitTimeText  != null) waitTimeText.text = $"{m:00}:{s:00}";

        
        if (spinnerIcon != null)
            spinnerIcon.Rotate(0f, 0f, -spinSpeed * Time.deltaTime);
    }

    private IEnumerator AnimateSearching()
    {
        string[] frames = { "Recherche d'adversaire", "Recherche d'adversaire.", "Recherche d'adversaire..", "Recherche d'adversaire..." };
        int i = 0;
        while (_running)
        {
            if (searchingText != null) searchingText.text = frames[i % frames.Length];
            i++;
            yield return new WaitForSeconds(0.4f);
        }
    }

    private void OnCancel()
    {
        _running = false;
        cancelButton.interactable = false;
        if (searchingText != null) searchingText.text = "Annulation...";
        GameManager.Instance.CancelMatchmaking();
    }
}
