using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;


public class MapTestController : MonoBehaviour
{
    public static MapData   PendingMap;
    public static int       PendingMapId   = -1;
    public static string    PendingMapTitle = "Map sans titre";

    [Header("Prefabs de tuiles")]
    public GameObject wallPrefab;
    public GameObject floorPrefab;
    public GameObject spawnP1Prefab;
    public GameObject spawnP2Prefab;
    public GameObject powerupPrefab;

    [Header("Taille d'une tuile (unités Unity)")]
    public float tileSize = 1f;

    [Header("UI")]
    public TMP_Text   mapTitleText;
    public TMP_Text   timerText;
    public TMP_Text   statusText;
    public Button     exitButton;
    public GameObject summaryPanel;
    public TMP_Text   summaryText;
    public Button     closeSummaryButton;

    [Header("Durée du test")]
    public float testDuration = 180f;   

    private float  _elapsed     = 0f;
    private bool   _testEnded   = false;

    private GameObject _mapRoot;                

     

    void Start()
    {
        
        mapTitleText.text = PendingMapTitle;
        statusText.text   = "Test en cours...";

        summaryPanel.SetActive(false);
        exitButton.onClick.AddListener(OnExitEarly);
        closeSummaryButton.onClick.AddListener(OnCloseSummary);

        if (PendingMap != null && PendingMap.cells != null && PendingMap.cells.Count > 0)
        {
            BuildMap(PendingMap);
            statusText.text = $"Map chargée ({PendingMap.cells.Count} tuiles)";
        }
        else
        {
            
            statusText.text = "Aucune map reçue — mode démo";
            BuildDemoMap();
        }
    }

    
    
    

    void Update()
    {
        if (_testEnded) return;

        _elapsed += Time.deltaTime;
        float remaining = Mathf.Max(0, testDuration - _elapsed);
        int m = (int)(remaining / 60);
        int s = (int)(remaining % 60);
        timerText.text = $"{m:00}:{s:00}";

        if (_elapsed >= testDuration)
            EndTest(completed: false);
    }

    
    
    

    private void BuildMap(MapData data)
    {
        
        _mapRoot = new GameObject("MapRoot");

        
        float centerX = (data.width  * tileSize) / 2f;
        float centerY = (data.height * tileSize) / 2f;
        Camera.main.orthographicSize = Mathf.Max(data.width, data.height) * tileSize / 2f;
        Camera.main.transform.position = new Vector3(centerX, centerY, -10f);
        Camera.main.backgroundColor = new Color(0.15f, 0.15f, 0.20f);

        
        foreach (var cell in data.cells)
        {
            GameObject prefab = GetPrefabForType(cell.type);
            if (prefab == null) continue;

            Vector3 pos = new Vector3(cell.x * tileSize, cell.y * tileSize, 0f);
            var tile = Instantiate(prefab, pos, Quaternion.identity, _mapRoot.transform);
            tile.name = $"tile_{cell.x}_{cell.y}_t{cell.type}";

            
            if (cell.type == 3) tile.tag = "SpawnP1";
            if (cell.type == 4) tile.tag = "SpawnP2";
        }
    }

    private GameObject GetPrefabForType(int type)
{
    Color[] colors = new Color[]
    {
        Color.clear,
        new Color(0.55f, 0.35f, 0.15f), 
        new Color(0.20f, 0.75f, 0.25f), 
        new Color(0.10f, 0.55f, 0.95f), 
        new Color(0.95f, 0.20f, 0.20f), 
        new Color(1.00f, 0.90f, 0.00f), 
    };

    if (type <= 0 || type >= colors.Length) return null;

    var go = new GameObject($"tile_t{type}");
    var sr = go.AddComponent<SpriteRenderer>();
    sr.color = colors[type];

    var tex = new Texture2D(32, 32);
    var pixels = new Color[32 * 32];
    for (int i = 0; i < pixels.Length; i++) pixels[i] = Color.white;
    tex.SetPixels(pixels);
    tex.Apply();
    sr.sprite = Sprite.Create(tex, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32);
    go.transform.localScale = new Vector3(tileSize, tileSize, 1f);

    return go;
}


    private void BuildDemoMap()
    {
        var demoData = new MapData("Démo", "", 16, 12);
        
        for (int x = 0; x < 16; x++) { demoData.cells.Add(new MapCell{x=x,y=0,type=1}); demoData.cells.Add(new MapCell{x=x,y=11,type=1}); }
        for (int y = 1; y < 11; y++) { demoData.cells.Add(new MapCell{x=0,y=y,type=1}); demoData.cells.Add(new MapCell{x=15,y=y,type=1}); }
        
        for (int y = 1; y < 11; y++)
            for (int x = 1; x < 15; x++)
                demoData.cells.Add(new MapCell{x=x,y=y,type=2});
        
        demoData.cells.Add(new MapCell{x=2, y=2, type=3});
        demoData.cells.Add(new MapCell{x=13,y=9, type=4});
        BuildMap(demoData);
    }

    
    
    

    
    public void OnPlayerCompletedMap()
    {

        EndTest(completed: true);
    }

    private void OnExitEarly()
    {
        EndTest(completed: false);
    }

    private void EndTest(bool completed)
    {
        if (_testEnded) return;
        _testEnded = true;

        int   durationSeconds  = Mathf.RoundToInt(_elapsed);
        float completionRate   = completed ? 1.0f : Mathf.Clamp01(_elapsed / testDuration);

        statusText.text = completed ? "Map terminée !" : "Test terminé.";

        
        if (PendingMapId >= 0)
            StartCoroutine(SubmitTest(PendingMapId, durationSeconds, completionRate, completed));
        else
            ShowSummary(durationSeconds, completionRate, completed, null);
    }

    private IEnumerator SubmitTest(int mapId, int duration, float completion, bool completed)
    {
        string resultMsg = null;
        yield return ApiManager.Instance.MarkMapTest(mapId, duration, completion,
            () => resultMsg = "Test enregistré sur le dashboard !",
            (err) => { resultMsg = "Test terminé (hors ligne)."; Debug.LogWarning(err); }
        );
        ShowSummary(duration, completion, completed, resultMsg);
    }

    
    
    

    private void ShowSummary(int duration, float completion, bool completed, string apiMsg)
    {
        summaryPanel.SetActive(true);

        int m = duration / 60;
        int s = duration % 60;
        string completionPct = $"{Mathf.RoundToInt(completion * 100)}%";

        summaryText.text =
            $"Map : {PendingMapTitle}\n\n" +
            $"Durée : {m:00}:{s:00}\n" +
            $"Complétion : {completionPct}\n" +
            $"Résultat : {(completed ? "✅ Terminée" : "⏱ Temps écoulé")}\n\n" +
            (apiMsg ?? "");
    }

    private void OnCloseSummary()
    {
        
        PendingMap      = null;
        PendingMapId    = -1;
        PendingMapTitle = "Map sans titre";

        
        
        if (GameManager.Instance.LocalPlayer != null)
            GameManager.Instance.GoToLobby();
        else
            Application.Quit();
    }
}
