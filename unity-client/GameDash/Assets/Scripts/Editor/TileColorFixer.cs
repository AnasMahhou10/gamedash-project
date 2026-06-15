#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;





public static class TileColorFixer
{
    [MenuItem("GameDash/Fix Tile Colors")]
    public static void FixTileColors()
    {
        FixPrefab("Assets/Prefabs/WallTile.prefab",    new Color(0.55f, 0.35f, 0.15f)); 
        FixPrefab("Assets/Prefabs/FloorTile.prefab",   new Color(0.20f, 0.75f, 0.25f)); 
        FixPrefab("Assets/Prefabs/SpawnP1Tile.prefab", new Color(0.10f, 0.55f, 0.95f)); 
        FixPrefab("Assets/Prefabs/SpawnP2Tile.prefab", new Color(0.95f, 0.20f, 0.20f)); 
        FixPrefab("Assets/Prefabs/PowerupTile.prefab", new Color(1.00f, 0.90f, 0.00f)); 

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        EditorUtility.DisplayDialog("GameDash", "✅ Couleurs des tuiles corrigées !", "OK");
        Debug.Log("[GameDash] Couleurs des tuiles corrigées.");
    }

    static void FixPrefab(string path, Color color)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (prefab == null) { Debug.LogWarning($"Prefab introuvable : {path}"); return; }

        var sr = prefab.GetComponent<SpriteRenderer>();
        if (sr == null) { Debug.LogWarning($"SpriteRenderer introuvable sur : {path}"); return; }

        
        var tex = new Texture2D(32, 32);
        var pixels = new Color[32 * 32];
        for (int i = 0; i < pixels.Length; i++) pixels[i] = Color.white;
        tex.SetPixels(pixels);
        tex.Apply();

        sr.sprite = Sprite.Create(tex, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32);
        sr.color  = color;

        EditorUtility.SetDirty(prefab);
        Debug.Log($"[GameDash] {path} → couleur corrigée.");
    }
}
#endif
