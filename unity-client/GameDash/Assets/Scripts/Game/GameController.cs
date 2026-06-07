using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Logique de la session de jeu.
/// ─ Jeu simple de type "survie à points" : chaque joueur a 3 vies.
///   Le premier à perdre toutes ses vies perd le match.
/// ─ Pour le MVP, on simule l'adversaire par IA locale.
///   L'appel API /matchmaking/finish reste réel.
/// </summary>
public class GameController : MonoBehaviour
{
    [Header("Références UI")]
    public TMP_Text playerLivesText;
    public TMP_Text opponentLivesText;
    public TMP_Text timerText;
    public TMP_Text statusText;
    public TMP_Text modeText;
    public Button   surrenderButton;
    public GameObject endPanel;
    public TMP_Text  endResultText;

    [Header("Joueur")]
    public GameObject playerObject;
    public float      playerSpeed = 5f;

    [Header("Projectile")]
    public GameObject bulletPrefab;
    public Transform  bulletSpawnPoint;
    public float      bulletSpeed   = 10f;
    public float      fireRate      = 0.3f;

    [Header("Adversaire IA")]
    public GameObject opponentObject;
    public float      aiFireRate    = 1.5f;
    public float      aiMoveSpeed   = 2f;

    [Header("Durée du match (secondes)")]
    public float matchDuration = 120f;

    // État interne
    private int   _playerLives   = 3;
    private int   _opponentLives = 3;
    private float _timeLeft;
    private bool  _gameOver      = false;
    private float _nextFireTime  = 0f;
    private float _nextAiFireTime = 0f;

    // On utilise l'id local du joueur et de l'adversaire
    private int _localId;
    private int _opponentId;

    void Start()
    {
        _timeLeft   = matchDuration;
        _localId    = GameManager.Instance.LocalPlayer.id;
        _opponentId = GameManager.Instance.CurrentOpponentId;

        modeText.text   = $"Mode : {GameManager.Instance.CurrentMode.ToUpper()}";
        statusText.text = "Combat en cours !";

        // If a pending map was provided by the lobby, build it
        if (MapTestController.PendingMap != null)
        {
            BuildMap(MapTestController.PendingMap);
            statusText.text = $"Map chargée ({MapTestController.PendingMap.cells.Count} tuiles)";
        }

        UpdateHUD();
        endPanel.SetActive(false);
        surrenderButton.onClick.AddListener(OnSurrender);
    }

    // Reuse BuildMap logic similar to MapTestController
    private GameObject _mapRoot;
    private void BuildMap(MapData data)
    {
        if (data == null) return;
        _mapRoot = new GameObject("MapRoot");

        float centerX = (data.width  * 1f) / 2f;
        float centerY = (data.height * 1f) / 2f;
        Camera.main.orthographicSize = Mathf.Max(data.width, data.height) * 1f / 2f;
        Camera.main.transform.position = new Vector3(centerX, centerY, -10f);
        Camera.main.backgroundColor = new Color(0.15f, 0.15f, 0.20f);

        foreach (var cell in data.cells)
        {
            GameObject prefab = GetPrefabForType(cell.type);
            if (prefab == null) continue;

            Vector3 pos = new Vector3(cell.x * 1f, cell.y * 1f, 0f);
            var tile = Instantiate(prefab, pos, Quaternion.identity, _mapRoot.transform);
            tile.name = $"tile_{cell.x}_{cell.y}_t{cell.type}";

            if (cell.type == 3) tile.tag = "SpawnP1";
            if (cell.type == 4) tile.tag = "SpawnP2";
        }
    }

    void Update()
    {
        if (_gameOver) return;

        HandleTimer();
        HandlePlayerInput();
        HandleAI();
    }

    // ──────────────────────────────────────────────────────────────
    // Timer
    // ──────────────────────────────────────────────────────────────

    private void HandleTimer()
    {
        _timeLeft -= Time.deltaTime;
        timerText.text = $"{Mathf.Max(0, _timeLeft):00.0}s";

        if (_timeLeft <= 0f)
        {
            // Fin du temps : le joueur avec le plus de vies gagne
            int winnerId = _playerLives >= _opponentLives ? _localId : _opponentId;
            EndGame(winnerId);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Contrôle joueur
    // ──────────────────────────────────────────────────────────────

    private void HandlePlayerInput()
    {
        // Déplacement ZQSD / Flèches
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        playerObject.transform.Translate(new Vector3(h, v, 0) * playerSpeed * Time.deltaTime);

        // Tir – Espace ou clic gauche
        if ((Input.GetKey(KeyCode.Space) || Input.GetMouseButton(0)) && Time.time >= _nextFireTime)
        {
            _nextFireTime = Time.time + fireRate;
            ShootBullet(playerObject.transform.position,
                        (opponentObject.transform.position - playerObject.transform.position).normalized,
                        isPlayerBullet: true);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // IA adversaire (simple suivi + tir)
    // ──────────────────────────────────────────────────────────────

    private void HandleAI()
    {
        // Déplacement vers le joueur
        Vector3 dir = (playerObject.transform.position - opponentObject.transform.position).normalized;
        opponentObject.transform.Translate(dir * aiMoveSpeed * Time.deltaTime);

        // Tir périodique
        if (Time.time >= _nextAiFireTime)
        {
            _nextAiFireTime = Time.time + aiFireRate;
            ShootBullet(opponentObject.transform.position, dir, isPlayerBullet: false);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Projectile
    // ──────────────────────────────────────────────────────────────

    private void ShootBullet(Vector3 origin, Vector3 direction, bool isPlayerBullet)
    {
        if (bulletPrefab == null) return;

        var bullet = Instantiate(bulletPrefab, origin, Quaternion.identity);
        var rb     = bullet.GetComponent<Rigidbody2D>();
        if (rb != null) rb.velocity = (Vector2)(direction * bulletSpeed);

        var bc = bullet.AddComponent<Bullet>();
        bc.isPlayerBullet = isPlayerBullet;
        bc.controller     = this;

        Destroy(bullet, 3f);
    }

    // ──────────────────────────────────────────────────────────────
    // Dégâts
    // ──────────────────────────────────────────────────────────────

    public void PlayerHit()
    {
        if (_gameOver) return;
        _playerLives = Mathf.Max(0, _playerLives - 1);
        UpdateHUD();
        if (_playerLives <= 0) EndGame(_opponentId);
    }

    public void OpponentHit()
    {
        if (_gameOver) return;
        _opponentLives = Mathf.Max(0, _opponentLives - 1);
        UpdateHUD();
        if (_opponentLives <= 0) EndGame(_localId);
    }

    // ──────────────────────────────────────────────────────────────
    // Fin de partie
    // ──────────────────────────────────────────────────────────────

    private void OnSurrender()
    {
        EndGame(_opponentId);
    }

    private void EndGame(int winnerId)
    {
        if (_gameOver) return;
        _gameOver = true;

        bool playerWon = (winnerId == _localId);
        statusText.text = playerWon ? "VICTOIRE !" : "DÉFAITE";

        endPanel.SetActive(true);
        endResultText.text = playerWon
            ? "🏆 Tu as gagné !"
            : "💀 Tu as perdu.";

        // Appel API
        GameManager.Instance.ReportMatchEnd(winnerId);
    }

    // ──────────────────────────────────────────────────────────────
    // HUD
    // ──────────────────────────────────────────────────────────────

    private void UpdateHUD()
    {
        playerLivesText.text   = $"Vies : {_playerLives}";
        opponentLivesText.text = $"Adversaire : {_opponentLives} vies";
    }
}

/// <summary>Composant temporaire ajouté dynamiquement aux projectiles.</summary>
public class Bullet : MonoBehaviour
{
    public bool           isPlayerBullet;
    public GameController controller;

    void OnTriggerEnter2D(Collider2D other)
    {
        if (isPlayerBullet && other.CompareTag("Opponent"))
        {
            controller.OpponentHit();
            Destroy(gameObject);
        }
        else if (!isPlayerBullet && other.CompareTag("Player"))
        {
            controller.PlayerHit();
            Destroy(gameObject);
        }
    }
}
