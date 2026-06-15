#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

public static class GameDashSceneBuilder
{
    private const string SCENES_PATH = "Assets/Scenes";

    private static readonly Color BG_DARK     = new Color(0.05f, 0.07f, 0.12f, 1f);
    private static readonly Color CYAN        = new Color(0.00f, 0.84f, 1.00f, 1f);
    private static readonly Color CYAN_DIM    = new Color(0.00f, 0.84f, 1.00f, 0.15f);
    private static readonly Color WHITE       = Color.white;
    private static readonly Color GRAY        = new Color(0.55f, 0.60f, 0.65f, 1f);
    private static readonly Color GREEN       = new Color(0.20f, 0.85f, 0.40f, 1f);
    private static readonly Color RED         = new Color(0.95f, 0.25f, 0.25f, 1f);
    private static readonly Color ORANGE      = new Color(1.00f, 0.55f, 0.10f, 1f);
    private static readonly Color TRANSPARENT = new Color(0, 0, 0, 0);

    [MenuItem("GameDash/Build All Scenes")]
    public static void BuildAllScenes()
    {
        if (!EditorUtility.DisplayDialog("GameDash Scene Builder",
            "Cela va créer/écraser les 7 scènes dans Assets/Scenes/.\nContinuer ?",
            "Oui, créer les scènes", "Annuler"))
            return;

        if (!Directory.Exists(SCENES_PATH))
            Directory.CreateDirectory(SCENES_PATH);

        BuildLoginScene();
        BuildLobbyScene();
        BuildQueueScene();
        BuildGameScene();
        BuildResultsScene();
        BuildMapEditorScene();
        BuildMapTestScene();

        RegisterScenesInBuildSettings();

        EditorUtility.DisplayDialog("GameDash Scene Builder",
            "✅ Les 7 scènes ont été créées dans Assets/Scenes/\n\n" +
            "Elles ont été ajoutées dans Build Settings.",
            "OK");

        Debug.Log("[GameDash] Toutes les scènes ont été créées avec succès.");
    }

    // ── SCÈNE 0 — LOGIN ───────────────────────────────────────────

    static void BuildLoginScene()
    {
        var scene = NewScene("Login");
        SetCameraBackground(BG_DARK);

        var gameDash = new GameObject("GameDash");
        gameDash.AddComponent<ApiManager>();
        gameDash.AddComponent<GameManager>();
        gameDash.AddComponent<DeeplinkHandler>();
        gameDash.AddComponent<GameWebSocketClient>();
        gameDash.AddComponent<MainThreadDispatcher>();

        var canvas = CreateCanvas("Canvas");
        var panel  = CreatePanel(canvas.transform, "Panel", BG_DARK);
        SetRectFull(panel);

        CreateText(panel.transform, "Title", "GAMEDASH", 42, CYAN,
            new Vector2(0.5f, 0.8f), new Vector2(0.5f, 0.8f), new Vector2(400, 60));
        CreateText(panel.transform, "Subtitle", "Connexion", 18, GRAY,
            new Vector2(0.5f, 0.7f), new Vector2(0.5f, 0.7f), new Vector2(300, 30));

        var emailInput    = CreateInputField(panel.transform, "EmailInput",    "Email",        new Vector2(0.5f, 0.57f));
        var passwordInput = CreateInputField(panel.transform, "PasswordInput", "Mot de passe", new Vector2(0.5f, 0.46f));
        passwordInput.contentType = TMP_InputField.ContentType.Password;
        passwordInput.ForceLabelUpdate();

        var loginBtn   = CreateButton(panel.transform, "LoginButton", "SE CONNECTER", CYAN,
            new Color(0.05f, 0.07f, 0.12f, 1f), new Vector2(0.5f, 0.34f), new Vector2(280, 48));
        var statusText = CreateText(panel.transform, "StatusText", "", 14, GRAY,
            new Vector2(0.5f, 0.26f), new Vector2(0.5f, 0.26f), new Vector2(300, 24));
        var spinner    = CreateSpinnerDot(panel.transform, "LoadingSpinner", new Vector2(0.5f, 0.20f));
        spinner.SetActive(false);

        var loginUI           = canvas.AddComponent<LoginUI>();
        loginUI.emailInput    = emailInput;
        loginUI.passwordInput = passwordInput;
        loginUI.loginButton   = loginBtn;
        loginUI.statusText    = statusText.GetComponent<TMP_Text>();
        loginUI.loadingSpinner = spinner;

        SaveScene(scene, "Login");
    }

    // ── SCÈNE 1 — LOBBY ───────────────────────────────────────────

    static void BuildLobbyScene()
{
    var scene = NewScene("Lobby");
    SetCameraBackground(BG_DARK);

    var canvas = CreateCanvas("Canvas");
    var panel  = CreatePanel(canvas.transform, "Panel", BG_DARK);
    SetRectFull(panel);

    CreateText(panel.transform, "Title", "LOBBY", 36, CYAN,
        new Vector2(0.5f, 0.90f), new Vector2(0.5f, 0.90f), new Vector2(300, 50));

    var pseudoText = CreateText(panel.transform, "PseudoText", "Joueur", 22, WHITE,
        new Vector2(0.5f, 0.80f), new Vector2(0.5f, 0.80f), new Vector2(300, 34));
    var levelText  = CreateText(panel.transform, "LevelText", "Niveau 1", 16, GRAY,
        new Vector2(0.5f, 0.74f), new Vector2(0.5f, 0.74f), new Vector2(300, 26));
    var eloText    = CreateText(panel.transform, "EloText", "MMR Ranked : 1000", 16, CYAN,
        new Vector2(0.5f, 0.69f), new Vector2(0.5f, 0.69f), new Vector2(300, 26));
    var coinsText  = CreateText(panel.transform, "CoinsText", "Coins : 0", 16, ORANGE,
        new Vector2(0.5f, 0.64f), new Vector2(0.5f, 0.64f), new Vector2(300, 26));

    CreateText(panel.transform, "ModesLabel", "CHOISIR UN MODE", 13, GRAY,
        new Vector2(0.5f, 0.57f), new Vector2(0.5f, 0.57f), new Vector2(300, 20));

    var rankedBtn   = CreateButton(panel.transform, "RankedButton",   "⚔  RANKED",        CYAN,   BG_DARK, new Vector2(0.5f, 0.50f), new Vector2(260, 48));
    var unrankedBtn = CreateButton(panel.transform, "UnrankedButton", "🎮 UNRANKED",       WHITE,  BG_DARK, new Vector2(0.5f, 0.41f), new Vector2(260, 48));
    var funBtn      = CreateButton(panel.transform, "FunButton",      "😄 FUN",            GREEN,  BG_DARK, new Vector2(0.5f, 0.32f), new Vector2(260, 48));

    var statusText    = CreateText(panel.transform, "StatusText", "", 14, GRAY,
        new Vector2(0.5f, 0.13f), new Vector2(0.5f, 0.13f), new Vector2(340, 24));

    var disconnectBtn = CreateButton(panel.transform, "DisconnectButton", "DÉCONNEXION", RED, BG_DARK,
        new Vector2(0.88f, 0.94f), new Vector2(150, 34));

    var lobbyUI              = canvas.AddComponent<LobbyUI>();
    lobbyUI.pseudoText       = pseudoText.GetComponent<TMP_Text>();
    lobbyUI.levelText        = levelText.GetComponent<TMP_Text>();
    lobbyUI.eloText          = eloText.GetComponent<TMP_Text>();
    lobbyUI.coinsText        = coinsText.GetComponent<TMP_Text>();
    lobbyUI.rankedButton     = rankedBtn;
    lobbyUI.unrankedButton   = unrankedBtn;
    lobbyUI.funButton        = funBtn;
    lobbyUI.disconnectButton = disconnectBtn;
    lobbyUI.statusText       = statusText.GetComponent<TMP_Text>();

    SaveScene(scene, "Lobby");
}
    // ── SCÈNE 2 — QUEUE ───────────────────────────────────────────

    static void BuildQueueScene()
    {
        var scene = NewScene("Queue");
        SetCameraBackground(BG_DARK);

        var canvas = CreateCanvas("Canvas");
        var panel  = CreatePanel(canvas.transform, "Panel", BG_DARK);
        SetRectFull(panel);

        CreateText(panel.transform, "Title", "RECHERCHE D'ADVERSAIRE", 28, CYAN,
            new Vector2(0.5f, 0.75f), new Vector2(0.5f, 0.75f), new Vector2(500, 44));

        var searchingText = CreateText(panel.transform, "SearchingText", "Recherche d'adversaire...", 20, WHITE,
            new Vector2(0.5f, 0.63f), new Vector2(0.5f, 0.63f), new Vector2(400, 32));
        var modeText      = CreateText(panel.transform, "ModeText", "—", 22, CYAN,
            new Vector2(0.5f, 0.55f), new Vector2(0.5f, 0.55f), new Vector2(280, 34));
        var waitTimeText  = CreateText(panel.transform, "WaitTimeText", "00:00", 18, GRAY,
            new Vector2(0.5f, 0.48f), new Vector2(0.5f, 0.48f), new Vector2(280, 26));
        var tipText       = CreateText(panel.transform, "TipText", "", 14, GRAY,
            new Vector2(0.5f, 0.40f), new Vector2(0.5f, 0.40f), new Vector2(500, 22));

        var spinnerIcon = CreateSpinnerDot(panel.transform, "SpinnerIcon", new Vector2(0.5f, 0.28f));
        var spinnerRT   = spinnerIcon.GetComponent<RectTransform>();
        spinnerRT.sizeDelta = new Vector2(40, 40);

        var cancelBtn = CreateButton(panel.transform, "CancelButton", "ANNULER", RED, BG_DARK,
            new Vector2(0.5f, 0.18f), new Vector2(200, 44));

        var queueUI              = canvas.AddComponent<QueueUI>();
        queueUI.modeText         = modeText.GetComponent<TMP_Text>();
        queueUI.waitTimeText     = waitTimeText.GetComponent<TMP_Text>();
        queueUI.searchingText    = searchingText.GetComponent<TMP_Text>();
        queueUI.tipText          = tipText.GetComponent<TMP_Text>();
        queueUI.cancelButton     = cancelBtn;
        queueUI.spinnerIcon      = spinnerIcon.GetComponent<RectTransform>();

        SaveScene(scene, "Queue");
    }

    // ── SCÈNE 3 — GAME ────────────────────────────────────────────

    static void BuildGameScene()
    {
        var scene = NewScene("Game");
        SetCameraBackground(new Color(0.03f, 0.05f, 0.10f));

        // Joueur
        var playerGO = CreateCircleSprite("Player", new Color(0.1f, 0.5f, 0.9f), new Vector3(-3f, 0f, 0f));
        playerGO.tag = EnsureTag("Player");
        var playerRB = playerGO.AddComponent<Rigidbody2D>();
        playerRB.gravityScale = 0;
        var playerCol = playerGO.AddComponent<CircleCollider2D>();
        playerCol.isTrigger = true;

        // Adversaire
        var opponentGO = CreateCircleSprite("Opponent", new Color(0.9f, 0.2f, 0.2f), new Vector3(3f, 0f, 0f));
        opponentGO.tag = EnsureTag("Opponent");
        var opponentRB = opponentGO.AddComponent<Rigidbody2D>();
        opponentRB.gravityScale = 0;
        var opponentCol = opponentGO.AddComponent<CircleCollider2D>();
        opponentCol.isTrigger = true;

        // Canvas HUD
        var canvas = CreateCanvas("Canvas");
        var panel  = CreatePanel(canvas.transform, "HUD", TRANSPARENT);
        SetRectFull(panel);

        var modeText          = CreateText(panel.transform, "ModeText",          "COMPÉTITIF", 14, CYAN,  new Vector2(0.5f,  0.96f), new Vector2(0.5f,  0.96f), new Vector2(300, 24));
        var playerNameText    = CreateText(panel.transform, "PlayerNameText",    "Joueur",     16, WHITE, new Vector2(0.15f, 0.96f), new Vector2(0.15f, 0.96f), new Vector2(200, 24));
        var opponentNameText  = CreateText(panel.transform, "OpponentNameText",  "Adversaire", 16, RED,   new Vector2(0.85f, 0.96f), new Vector2(0.85f, 0.96f), new Vector2(200, 24));
        var timerText         = CreateText(panel.transform, "TimerText",         "02:00",      24, WHITE, new Vector2(0.5f,  0.91f), new Vector2(0.5f,  0.91f), new Vector2(120, 34));
        var statusText        = CreateText(panel.transform, "StatusText",        "",           16, WHITE, new Vector2(0.5f,  0.85f), new Vector2(0.5f,  0.85f), new Vector2(400, 24));

        // End panel
        var endPanel = CreatePanel(panel.transform, "EndPanel", new Color(0f, 0f, 0f, 0.88f));
        SetRectFull(endPanel);
        var endTitleText    = CreateText(endPanel.transform, "EndTitleText",    "VICTOIRE",                     56, GREEN, new Vector2(0.5f, 0.60f), new Vector2(0.5f, 0.60f), new Vector2(500, 80));
        var endSubtitleText = CreateText(endPanel.transform, "EndSubtitleText", "Tu as dominé l'adversaire !",  22, GRAY,  new Vector2(0.5f, 0.48f), new Vector2(0.5f, 0.48f), new Vector2(500, 34));
        var returnMenuBtn   = CreateButton(endPanel.transform, "ReturnMenuButton", "← MENU PRINCIPAL", WHITE, BG_DARK, new Vector2(0.5f, 0.34f), new Vector2(240, 48));
        endPanel.SetActive(false);

        // MultiplayerGameController
        var controllerGO = new GameObject("GameController");
        var gc           = controllerGO.AddComponent<MultiplayerGameController>();
        gc.statusText        = statusText.GetComponent<TMP_Text>();
        gc.modeText          = modeText.GetComponent<TMP_Text>();
        gc.playerNameText    = playerNameText.GetComponent<TMP_Text>();
        gc.opponentNameText  = opponentNameText.GetComponent<TMP_Text>();
        gc.returnMenuButton  = returnMenuBtn;
        gc.endPanel          = endPanel;
        gc.endTitleText      = endTitleText.GetComponent<TMP_Text>();
        gc.endSubtitleText   = endSubtitleText.GetComponent<TMP_Text>();
        gc.playerObject      = playerGO;
        gc.opponentObject    = opponentGO;

        SaveScene(scene, "Game");
    }

    // ── SCÈNE 4 — RESULTS ─────────────────────────────────────────

    static void BuildResultsScene()
    {
        var scene = NewScene("Results");
        SetCameraBackground(BG_DARK);

        var canvas = CreateCanvas("Canvas");
        var panel  = CreatePanel(canvas.transform, "Panel", BG_DARK);
        SetRectFull(panel);

        var resultTitle  = CreateText(panel.transform, "ResultTitle",  "VICTOIRE",   48, GREEN,  new Vector2(0.5f, 0.82f), new Vector2(0.5f, 0.82f), new Vector2(400, 64));
        var modeText     = CreateText(panel.transform, "ModeText",     "Mode : —",   16, GRAY,   new Vector2(0.5f, 0.72f), new Vector2(0.5f, 0.72f), new Vector2(280, 26));

        var statsCard    = CreatePanel(panel.transform, "StatsCard", new Color(0.08f, 0.12f, 0.18f, 1f));
        var statsRect    = statsCard.GetComponent<RectTransform>();
        statsRect.anchorMin = new Vector2(0.25f, 0.48f);
        statsRect.anchorMax = new Vector2(0.75f, 0.68f);
        statsRect.offsetMin = statsRect.offsetMax = Vector2.zero;

        var mmrText   = CreateText(statsCard.transform, "MMRText",   "MMR : +0",   18, CYAN,   new Vector2(0.5f, 0.75f), new Vector2(0.5f, 0.75f), new Vector2(240, 28));
        var xpText    = CreateText(statsCard.transform, "XPText",    "XP  : +0",   16, WHITE,  new Vector2(0.5f, 0.50f), new Vector2(0.5f, 0.50f), new Vector2(240, 26));
        var coinsText = CreateText(statsCard.transform, "CoinsText", "Coins : +0", 16, ORANGE, new Vector2(0.5f, 0.25f), new Vector2(0.5f, 0.25f), new Vector2(240, 26));

        var lobbyBtn  = CreateButton(panel.transform, "BackToLobbyButton", "← MENU PRINCIPAL", WHITE, BG_DARK,
            new Vector2(0.5f, 0.32f), new Vector2(260, 48));

        var resultsUI             = canvas.AddComponent<ResultsUI>();
        resultsUI.resultTitle     = resultTitle.GetComponent<TMP_Text>();
        resultsUI.modeText        = modeText.GetComponent<TMP_Text>();
        resultsUI.mmrChangeText   = mmrText.GetComponent<TMP_Text>();
        resultsUI.xpGainedText    = xpText.GetComponent<TMP_Text>();
        resultsUI.coinsGainedText = coinsText.GetComponent<TMP_Text>();
        resultsUI.backToLobbyButton = lobbyBtn;

        SaveScene(scene, "Results");
    }

    // ── SCÈNE 5 — MAP EDITOR ──────────────────────────────────────

    static void BuildMapEditorScene()
    {
        var scene = NewScene("MapEditor");
        SetCameraBackground(BG_DARK);

        var canvas = CreateCanvas("Canvas");
        var root   = CreatePanel(canvas.transform, "Root", BG_DARK);
        SetRectFull(root);

        CreateText(root.transform, "Title", "ÉDITEUR DE MAPS", 28, CYAN,
            new Vector2(0.5f, 0.95f), new Vector2(0.5f, 0.95f), new Vector2(400, 42));

        var paletteGO   = new GameObject("Palette");
        paletteGO.transform.SetParent(root.transform, false);
        var paletteRect = paletteGO.AddComponent<RectTransform>();
        paletteRect.anchorMin = new Vector2(0.02f, 0.87f);
        paletteRect.anchorMax = new Vector2(0.98f, 0.93f);
        paletteRect.offsetMin = paletteRect.offsetMax = Vector2.zero;
        var hLayout = paletteGO.AddComponent<HorizontalLayoutGroup>();
        hLayout.spacing = 6;
        hLayout.childForceExpandWidth  = true;
        hLayout.childForceExpandHeight = true;

        var selectedTileLabel = CreateText(root.transform, "SelectedTileLabel", "Pinceau : Mur", 13, CYAN,
            new Vector2(0.5f, 0.85f), new Vector2(0.5f, 0.85f), new Vector2(300, 20));

        var gridGO   = new GameObject("Grid");
        gridGO.transform.SetParent(root.transform, false);
        var gridRect = gridGO.AddComponent<RectTransform>();
        gridRect.anchorMin = new Vector2(0.02f, 0.30f);
        gridRect.anchorMax = new Vector2(0.98f, 0.84f);
        gridRect.offsetMin = gridRect.offsetMax = Vector2.zero;
        var gridLayout            = gridGO.AddComponent<GridLayoutGroup>();
        gridLayout.constraint     = GridLayoutGroup.Constraint.FixedColumnCount;
        gridLayout.constraintCount = 16;
        gridLayout.spacing        = new Vector2(1, 1);
        gridLayout.cellSize       = new Vector2(36, 28);
        gridGO.AddComponent<Image>().color = new Color(0.10f, 0.12f, 0.16f, 1f);

        GameObject cellBtnPrefab    = GetOrCreateCellButtonPrefab();
        GameObject paletteBtnPrefab = GetOrCreatePaletteButtonPrefab();

        var mapNameInput      = CreateInputField(root.transform, "MapNameInput",      "Nom de la map",    new Vector2(0.5f, 0.24f));
        var mapDescInput      = CreateInputField(root.transform, "MapDescInput",      "Description",      new Vector2(0.5f, 0.18f));
        var versionNotesInput = CreateInputField(root.transform, "VersionNotesInput", "Notes de version", new Vector2(0.5f, 0.12f));

        var publishBtn    = CreateButton(root.transform, "PublishButton",    "PUBLIER",          CYAN,  BG_DARK, new Vector2(0.22f, 0.05f), new Vector2(150, 40));
        var newVersionBtn = CreateButton(root.transform, "NewVersionButton", "NOUVELLE VERSION", WHITE, BG_DARK, new Vector2(0.50f, 0.05f), new Vector2(190, 40));
        var clearBtn      = CreateButton(root.transform, "ClearButton",      "EFFACER",          RED,   BG_DARK, new Vector2(0.72f, 0.05f), new Vector2(130, 40));
        var backBtn       = CreateButton(root.transform, "BackButton",       "← MENU",           GRAY,  BG_DARK, new Vector2(0.88f, 0.95f), new Vector2(120, 32));

        var statusText = CreateText(root.transform, "StatusText", "", 13, GREEN,
            new Vector2(0.5f, 0.27f), new Vector2(0.5f, 0.27f), new Vector2(400, 20));
        var mapIdText  = CreateText(root.transform, "MapIdText", "", 12, GRAY,
            new Vector2(0.5f, 0.01f), new Vector2(0.5f, 0.01f), new Vector2(300, 18));

        var editorGO = new GameObject("MapEditorController");
        var mec      = editorGO.AddComponent<MapEditorController>();
        mec.gridContainer       = gridGO.transform;
        mec.cellButtonPrefab    = cellBtnPrefab;
        mec.paletteContainer    = paletteGO.transform;
        mec.paletteButtonPrefab = paletteBtnPrefab;
        mec.mapNameInput        = mapNameInput;
        mec.mapDescInput        = mapDescInput;
        mec.versionNotesInput   = versionNotesInput;
        mec.publishButton       = publishBtn;
        mec.newVersionButton    = newVersionBtn;
        mec.clearButton         = clearBtn;
        mec.backButton          = backBtn;
        mec.statusText          = statusText.GetComponent<TMP_Text>();
        mec.selectedTileLabel   = selectedTileLabel.GetComponent<TMP_Text>();
        mec.mapIdText           = mapIdText.GetComponent<TMP_Text>();

        SaveScene(scene, "MapEditor");
    }

    // ── SCÈNE 6 — MAP TEST ────────────────────────────────────────

    static void BuildMapTestScene()
    {
        var scene = NewScene("MapTest");
        SetCameraBackground(new Color(0.04f, 0.06f, 0.10f));

        var canvas = CreateCanvas("Canvas");
        var panel  = CreatePanel(canvas.transform, "HUD", TRANSPARENT);
        SetRectFull(panel);

        var mapTitleText = CreateText(panel.transform, "MapTitleText", "Map : —",          18, CYAN,  new Vector2(0.5f, 0.96f), new Vector2(0.5f, 0.96f), new Vector2(400, 28));
        var timerText    = CreateText(panel.transform, "TimerText",    "03:00",             22, WHITE, new Vector2(0.5f, 0.91f), new Vector2(0.5f, 0.91f), new Vector2(120, 32));
        var statusText   = CreateText(panel.transform, "StatusText",   "Test en cours...", 14, GRAY,  new Vector2(0.5f, 0.86f), new Vector2(0.5f, 0.86f), new Vector2(300, 22));
        var exitBtn      = CreateButton(panel.transform, "ExitButton",  "Quitter le test",  RED, TRANSPARENT, new Vector2(0.5f, 0.06f), new Vector2(180, 36));

        var summaryPanel = CreatePanel(panel.transform, "SummaryPanel", new Color(0f, 0f, 0f, 0.90f));
        SetRectFull(summaryPanel);
        var summaryText  = CreateText(summaryPanel.transform, "SummaryText", "Résultats...", 18, WHITE,
            new Vector2(0.5f, 0.60f), new Vector2(0.5f, 0.60f), new Vector2(500, 200));
        var closeBtn     = CreateButton(summaryPanel.transform, "CloseSummaryButton", "FERMER", CYAN, BG_DARK,
            new Vector2(0.5f, 0.30f), new Vector2(200, 44));
        summaryPanel.SetActive(false);

        EnsurePrefabsFolder();
        var wallPrefab    = GetOrCreateTilePrefab("WallTile",    new Color(0.30f, 0.20f, 0.10f));
        var floorPrefab   = GetOrCreateTilePrefab("FloorTile",   new Color(0.15f, 0.45f, 0.15f));
        var spawnP1Prefab = GetOrCreateTilePrefab("SpawnP1Tile", new Color(0.10f, 0.45f, 0.85f));
        var spawnP2Prefab = GetOrCreateTilePrefab("SpawnP2Tile", new Color(0.85f, 0.15f, 0.15f));
        var powerupPrefab = GetOrCreateTilePrefab("PowerupTile", new Color(1.00f, 0.85f, 0.00f));

        var mtcGO = new GameObject("MapTestController");
        var mtc   = mtcGO.AddComponent<MapTestController>();
        mtc.wallPrefab         = wallPrefab;
        mtc.floorPrefab        = floorPrefab;
        mtc.spawnP1Prefab      = spawnP1Prefab;
        mtc.spawnP2Prefab      = spawnP2Prefab;
        mtc.powerupPrefab      = powerupPrefab;
        mtc.mapTitleText       = mapTitleText.GetComponent<TMP_Text>();
        mtc.timerText          = timerText.GetComponent<TMP_Text>();
        mtc.statusText         = statusText.GetComponent<TMP_Text>();
        mtc.exitButton         = exitBtn;
        mtc.summaryPanel       = summaryPanel;
        mtc.summaryText        = summaryText.GetComponent<TMP_Text>();
        mtc.closeSummaryButton = closeBtn;

        SaveScene(scene, "MapTest");
    }

    // ── Build Settings ────────────────────────────────────────────

    static void RegisterScenesInBuildSettings()
    {
        string[] sceneNames = { "Login", "Lobby", "Queue", "Game", "Results", "MapEditor", "MapTest" };
        var scenes = new EditorBuildSettingsScene[sceneNames.Length];
        for (int i = 0; i < sceneNames.Length; i++)
            scenes[i] = new EditorBuildSettingsScene($"{SCENES_PATH}/{sceneNames[i]}.unity", true);
        EditorBuildSettings.scenes = scenes;
        Debug.Log("[GameDash] Build Settings mis à jour avec 7 scènes.");
    }

    // ── HELPERS UI ────────────────────────────────────────────────

    static UnityEngine.SceneManagement.Scene NewScene(string name)
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        scene.name = name;
        return scene;
    }

    static void SaveScene(UnityEngine.SceneManagement.Scene scene, string name)
    {
        string path = $"{SCENES_PATH}/{name}.unity";
        EditorSceneManager.SaveScene(scene, path);
        Debug.Log($"[GameDash] Scène '{name}' sauvegardée → {path}");
    }

    static void SetCameraBackground(Color color)
    {
        var cam = GameObject.FindObjectOfType<Camera>();
        if (cam == null)
        {
            var camGO = new GameObject("Main Camera");
            camGO.tag = "MainCamera";
            cam = camGO.AddComponent<Camera>();
            camGO.AddComponent<AudioListener>();
        }
        cam.clearFlags      = CameraClearFlags.SolidColor;
        cam.backgroundColor = color;
        cam.orthographic    = true;
        cam.orthographicSize = 5f;
        cam.transform.position = new Vector3(0, 0, -10);
    }

    static GameObject CreateCanvas(string name)
    {
        var go     = new GameObject(name);
        var canvas = go.AddComponent<Canvas>();
        canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 0;
        var scaler = go.AddComponent<CanvasScaler>();
        scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        scaler.matchWidthOrHeight  = 0.5f;
        go.AddComponent<GraphicRaycaster>();

        if (GameObject.FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
        {
            var esGO = new GameObject("EventSystem");
            esGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            esGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }
        return go;
    }

    static GameObject CreatePanel(Transform parent, string name, Color color)
    {
        var go  = new GameObject(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<Image>().color = color;
        go.AddComponent<RectTransform>();
        return go;
    }

    static void SetRectFull(GameObject go)
    {
        var rt = go.GetComponent<RectTransform>() ?? go.AddComponent<RectTransform>();
        rt.anchorMin = Vector2.zero;
        rt.anchorMax = Vector2.one;
        rt.offsetMin = rt.offsetMax = Vector2.zero;
    }

    static GameObject CreateText(Transform parent, string name, string content,
        int fontSize, Color color, Vector2 anchorMin, Vector2 anchorMax, Vector2 size)
    {
        var go  = new GameObject(name);
        go.transform.SetParent(parent, false);
        var txt       = go.AddComponent<TextMeshProUGUI>();
        txt.text      = content;
        txt.fontSize  = fontSize;
        txt.color     = color;
        txt.alignment = TextAlignmentOptions.Center;
        var rt        = go.GetComponent<RectTransform>();
        rt.anchorMin  = anchorMin;
        rt.anchorMax  = anchorMax;
        rt.pivot      = new Vector2(0.5f, 0.5f);
        rt.anchoredPosition = Vector2.zero;
        rt.sizeDelta  = size;
        return go;
    }

    static TMP_InputField CreateInputField(Transform parent, string name,
        string placeholder, Vector2 anchor)
    {
        var go  = new GameObject(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<Image>().color = new Color(0.10f, 0.13f, 0.18f, 1f);

        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = anchor; rt.anchorMax = anchor;
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.anchoredPosition = Vector2.zero;
        rt.sizeDelta = new Vector2(340, 46);

        var textAreaGO = new GameObject("Text Area");
        textAreaGO.transform.SetParent(go.transform, false);
        var textAreaRT = textAreaGO.AddComponent<RectTransform>();
        textAreaRT.anchorMin = Vector2.zero; textAreaRT.anchorMax = Vector2.one;
        textAreaRT.offsetMin = new Vector2(10, 4); textAreaRT.offsetMax = new Vector2(-10, -4);
        textAreaGO.AddComponent<RectMask2D>();

        var phGO  = new GameObject("Placeholder");
        phGO.transform.SetParent(textAreaGO.transform, false);
        var phRT  = phGO.AddComponent<RectTransform>();
        phRT.anchorMin = Vector2.zero; phRT.anchorMax = Vector2.one;
        phRT.offsetMin = phRT.offsetMax = Vector2.zero;
        var phTxt = phGO.AddComponent<TextMeshProUGUI>();
        phTxt.text = placeholder; phTxt.fontSize = 16;
        phTxt.color = new Color(0.5f, 0.5f, 0.5f, 0.7f);

        var inputTextGO = new GameObject("Text");
        inputTextGO.transform.SetParent(textAreaGO.transform, false);
        var inputTextRT = inputTextGO.AddComponent<RectTransform>();
        inputTextRT.anchorMin = Vector2.zero; inputTextRT.anchorMax = Vector2.one;
        inputTextRT.offsetMin = inputTextRT.offsetMax = Vector2.zero;
        var inputTxt  = inputTextGO.AddComponent<TextMeshProUGUI>();
        inputTxt.fontSize = 16; inputTxt.color = WHITE;

        var field           = go.AddComponent<TMP_InputField>();
        field.textViewport  = textAreaRT;
        field.textComponent = inputTxt;
        field.placeholder   = phTxt;
        field.fontAsset     = inputTxt.font;
        return field;
    }

    static Button CreateButton(Transform parent, string name, string label,
        Color textColor, Color bgColor, Vector2 anchor, Vector2 size)
    {
        var go  = new GameObject(name);
        go.transform.SetParent(parent, false);
        var resolvedBg = bgColor == TRANSPARENT ? new Color(0.12f, 0.18f, 0.28f, 0.8f) : bgColor;
        go.AddComponent<Image>().color = resolvedBg;
        var btn    = go.AddComponent<Button>();
        var colors = btn.colors;
        colors.normalColor      = resolvedBg;
        colors.highlightedColor = Color.Lerp(resolvedBg, Color.white, 0.15f);
        colors.pressedColor     = Color.Lerp(resolvedBg, Color.black, 0.25f);
        btn.colors = colors;

        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = anchor; rt.anchorMax = anchor;
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.anchoredPosition = Vector2.zero;
        rt.sizeDelta = size;

        var lblGO = new GameObject("Label");
        lblGO.transform.SetParent(go.transform, false);
        var lblRT = lblGO.AddComponent<RectTransform>();
        lblRT.anchorMin = Vector2.zero; lblRT.anchorMax = Vector2.one;
        lblRT.offsetMin = lblRT.offsetMax = Vector2.zero;
        var txt       = lblGO.AddComponent<TextMeshProUGUI>();
        txt.text      = label; txt.fontSize = 15;
        txt.fontStyle = FontStyles.Bold;
        txt.color     = textColor;
        txt.alignment = TextAlignmentOptions.Center;
        return btn;
    }

    static GameObject CreateSpinnerDot(Transform parent, string name, Vector2 anchor)
    {
        var go  = new GameObject(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<Image>().color = CYAN;
        var rt = go.GetComponent<RectTransform>();
        rt.anchorMin = anchor; rt.anchorMax = anchor;
        rt.pivot = new Vector2(0.5f, 0.5f);
        rt.anchoredPosition = Vector2.zero;
        rt.sizeDelta = new Vector2(24, 24);
        return go;
    }

    static GameObject CreateCircleSprite(string name, Color color, Vector3 worldPos)
    {
        var go = new GameObject(name);
        go.transform.position = worldPos;
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = CreateCircleSprite();
        sr.color  = color;
        sr.sortingOrder = 5;
        go.transform.localScale = new Vector3(0.8f, 0.8f, 1f);
        return go;
    }

    static Sprite CreateCircleSprite()
    {
        int size = 64;
        var tex  = new Texture2D(size, size);
        float cx = size / 2f, cy = size / 2f, r = size / 2f - 1f;
        for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float dx = x - cx, dy = y - cy;
                tex.SetPixel(x, y, Mathf.Sqrt(dx*dx + dy*dy) <= r ? Color.white : TRANSPARENT);
            }
        tex.Apply();
        return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
    }

    static Sprite CreateSquareSprite()
    {
        var tex = new Texture2D(1, 1);
        tex.SetPixel(0, 0, Color.white);
        tex.Apply();
        return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f));
    }

    // ── PREFABS ───────────────────────────────────────────────────

    static void EnsurePrefabsFolder()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Prefabs"))
            AssetDatabase.CreateFolder("Assets", "Prefabs");
    }

    static GameObject GetOrCreateBulletPrefab()
    {
        EnsurePrefabsFolder();
        string path     = "Assets/Prefabs/Bullet.prefab";
        var    existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (existing != null) return existing;

        var go  = new GameObject("Bullet");
        var sr  = go.AddComponent<SpriteRenderer>();
        sr.sprite = CreateCircleSprite(); sr.color = Color.yellow;
        go.transform.localScale = new Vector3(0.25f, 0.25f, 1f);
        var rb  = go.AddComponent<Rigidbody2D>(); rb.gravityScale = 0;
        var col = go.AddComponent<CircleCollider2D>(); col.isTrigger = true;

        var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return prefab;
    }

    static GameObject GetOrCreateCellButtonPrefab()
    {
        EnsurePrefabsFolder();
        string path     = "Assets/Prefabs/CellButton.prefab";
        var    existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (existing != null) return existing;

        var go  = new GameObject("CellButton");
        go.AddComponent<Image>().color = new Color(0.15f, 0.15f, 0.15f, 1f);
        go.AddComponent<Button>();
        go.GetComponent<RectTransform>().sizeDelta = new Vector2(36, 28);

        var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return prefab;
    }

    static GameObject GetOrCreatePaletteButtonPrefab()
    {
        EnsurePrefabsFolder();
        string path     = "Assets/Prefabs/PaletteButton.prefab";
        var    existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (existing != null) return existing;

        var go  = new GameObject("PaletteButton");
        go.AddComponent<Image>().color = Color.gray;
        go.AddComponent<Button>();

        var lblGO = new GameObject("Label");
        lblGO.transform.SetParent(go.transform, false);
        var lblRT = lblGO.AddComponent<RectTransform>();
        lblRT.anchorMin = Vector2.zero; lblRT.anchorMax = Vector2.one;
        lblRT.offsetMin = lblRT.offsetMax = Vector2.zero;
        var txt   = lblGO.AddComponent<TextMeshProUGUI>();
        txt.text = "Tile"; txt.fontSize = 11;
        txt.color = WHITE; txt.alignment = TextAlignmentOptions.Center;

        var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return prefab;
    }

    static GameObject GetOrCreateTilePrefab(string name, Color color)
    {
        EnsurePrefabsFolder();
        string path     = $"Assets/Prefabs/{name}.prefab";
        var    existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (existing != null) return existing;

        var go = new GameObject(name);
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = CreateSquareSprite(); sr.color = color;
        go.transform.localScale = Vector3.one;

        var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
        Object.DestroyImmediate(go);
        return prefab;
    }

    // ── Tags ──────────────────────────────────────────────────────

    static string EnsureTag(string tagName)
    {
        var tagManager = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);
        var tagsProp   = tagManager.FindProperty("tags");

        for (int i = 0; i < tagsProp.arraySize; i++)
            if (tagsProp.GetArrayElementAtIndex(i).stringValue == tagName)
                return tagName;

        tagsProp.InsertArrayElementAtIndex(tagsProp.arraySize);
        tagsProp.GetArrayElementAtIndex(tagsProp.arraySize - 1).stringValue = tagName;
        tagManager.ApplyModifiedProperties();
        Debug.Log($"[GameDash] Tag '{tagName}' ajouté.");
        return tagName;
    }
}
#endif