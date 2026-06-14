using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;















public class MapEditorController : MonoBehaviour
{
    
    [Header("Grille")]
    public Transform  gridContainer;   
    public GameObject cellButtonPrefab;
    public int        gridWidth  = 16;
    public int        gridHeight = 12;

    
    private static readonly Color[] TileColors = new Color[]
    {
        new Color(0.15f, 0.15f, 0.15f),  
        new Color(0.30f, 0.20f, 0.10f),  
        new Color(0.20f, 0.60f, 0.20f),  
        new Color(0.10f, 0.50f, 0.90f),  
        new Color(0.90f, 0.20f, 0.20f),  
        new Color(1.00f, 0.85f, 0.00f),  
    };

    private static readonly string[] TileNames = { "Vide", "Mur", "Sol", "Spawn J1", "Spawn J2", "Powerup" };

    
    [Header("UI – Meta map")]
    public TMP_InputField mapNameInput;
    public TMP_InputField mapDescInput;
    public TMP_InputField versionNotesInput;

    [Header("UI – Palette")]
    public Transform  paletteContainer;  
    public GameObject paletteButtonPrefab;

    [Header("UI – Actions")]
    public Button   publishButton;
    public Button   newVersionButton;
    public Button   clearButton;
    public Button   backButton;
    public TMP_Text statusText;
    public TMP_Text selectedTileLabel;

    [Header("UI – Infos map publiée")]
    public TMP_Text mapIdText;

    
    private int[,]         _grid;
    private Button[,]      _cellButtons;
    private int            _selectedTile = 1;   
    private int            _publishedMapId = -1; 

    
    
    

    void Start()
    {
        _grid        = new int[gridWidth, gridHeight];
        _cellButtons = new Button[gridWidth, gridHeight];

        BuildPalette();
        BuildGrid();
        UpdatePaletteLabel();

        publishButton.onClick.AddListener(OnPublish);
        newVersionButton.onClick.AddListener(OnNewVersion);
        clearButton.onClick.AddListener(ClearGrid);
        backButton.onClick.AddListener(GameManager.Instance.GoToLobby);

        newVersionButton.interactable = false;
        statusText.text = "";
        mapIdText.text  = "";
    }

    
    
    

    private void BuildPalette()
    {
        for (int t = 0; t < TileNames.Length; t++)
        {
            int tileType = t;
            var go   = Instantiate(paletteButtonPrefab, paletteContainer);
            var btn  = go.GetComponent<Button>();
            var img  = go.GetComponent<Image>();
            var lbl  = go.GetComponentInChildren<TMP_Text>();

            img.color = TileColors[t];
            if (lbl != null) lbl.text = TileNames[t];
            btn.onClick.AddListener(() => SelectTile(tileType));
        }
    }

    
    
    

    private void BuildGrid()
    {
        for (int y = 0; y < gridHeight; y++)
        {
            for (int x = 0; x < gridWidth; x++)
            {
                int cx = x, cy = y;
                var go  = Instantiate(cellButtonPrefab, gridContainer);
                var btn = go.GetComponent<Button>();
                var img = go.GetComponent<Image>();

                img.color = TileColors[0];
                btn.onClick.AddListener(() => PaintCell(cx, cy));

                _cellButtons[x, y] = btn;
            }
        }
    }

    
    
    

    private void PaintCell(int x, int y)
    {
        _grid[x, y] = _selectedTile;
        _cellButtons[x, y].GetComponent<Image>().color = TileColors[_selectedTile];

    }

    private void SelectTile(int type)
    {
        _selectedTile = type;
        UpdatePaletteLabel();
    }

    private void UpdatePaletteLabel()
    {
        selectedTileLabel.text = $"Pinceau : {TileNames[_selectedTile]}";
    }

    private void ClearGrid()
    {
        for (int y = 0; y < gridHeight; y++)
            for (int x = 0; x < gridWidth; x++)
            {
                _grid[x, y] = 0;
                _cellButtons[x, y].GetComponent<Image>().color = TileColors[0];
            }

    }

    
    
    

    private MapData BuildMapData()
    {
        string name = mapNameInput.text.Trim();
        string desc = mapDescInput.text.Trim();
        if (string.IsNullOrEmpty(name)) name = "Ma map sans titre";

        var data = new MapData(name, desc, gridWidth, gridHeight);

        for (int y = 0; y < gridHeight; y++)
            for (int x = 0; x < gridWidth; x++)
                if (_grid[x, y] != 0)    
                    data.cells.Add(new MapCell { x = x, y = y, type = _grid[x, y] });

        return data;
    }

    
    
    

    private void OnPublish()
    {
        if (!ValidateForm()) return;

        MapData data = BuildMapData();

        var payload = new CreateMapRequest
        {
            title       = data.name,
            description = data.description,
            status      = "beta",
            content_url = data.ToBase64(),
            tags        = new string[] { "unity", "editor" },
            screenshot_urls = new string[0]
        };

        SetBusy(true, "Publication en cours...");
        StartCoroutine(ApiManager.Instance.CreateMap(payload,
            (resp) =>
            {
                _publishedMapId = resp.map_id;

                SetBusy(false, $"✅ Map publiée ! ID #{_publishedMapId}");
                mapIdText.text = $"Map ID : {_publishedMapId}";
                newVersionButton.interactable = true;
            },
            (err) =>
            {
                SetBusy(false, "❌ Erreur de publication.");
                Debug.LogError("CreateMap: " + err);
            }
        ));
    }

    
    
    

    private void OnNewVersion()
    {
        if (_publishedMapId < 0) { statusText.text = "Publie d'abord une map."; return; }

        string notes = versionNotesInput.text.Trim();
        if (string.IsNullOrEmpty(notes)) notes = "Mise à jour";

        MapData data = BuildMapData();

        var payload = new AddVersionRequest
        {
            map_id      = _publishedMapId,
            notes       = notes,
            content_url = data.ToBase64(),
            screenshot_urls = new string[0]
        };

        SetBusy(true, "Envoi de la version...");
        StartCoroutine(ApiManager.Instance.AddMapVersion(payload,
            (resp) =>
            {

                SetBusy(false, $"✅ {resp.version} publiée !");
            },
            (err) =>
            {
                SetBusy(false, "❌ Erreur lors de la mise à jour.");
                Debug.LogError("AddMapVersion: " + err);
            }
        ));
    }

    
    
    

    private bool ValidateForm()
    {
        if (string.IsNullOrWhiteSpace(mapNameInput.text))
        {
            statusText.text = "Donne un nom à ta map.";
            return false;
        }
        return true;
    }

    private void SetBusy(bool busy, string msg)
    {
        statusText.text = msg;
        publishButton.interactable    = !busy;
        newVersionButton.interactable = !busy && _publishedMapId >= 0;
        clearButton.interactable      = !busy;
    }
}
