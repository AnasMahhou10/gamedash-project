using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;









[Serializable]
public class MapCell
{
    public int x;
    public int y;
    public int type;
}


[Serializable]
public class MapData
{
    public string       name;
    public string       description;
    public int          width;
    public int          height;
    public List<MapCell> cells;

    public MapData(string name, string desc, int w, int h)
    {
        this.name        = name;
        this.description = desc;
        this.width       = w;
        this.height      = h;
        this.cells       = new List<MapCell>();
    }

    
    public string ToBase64()
    {
        string json = JsonUtility.ToJson(this);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
    }

    public static MapData FromBase64(string b64)
    {
        string json = Encoding.UTF8.GetString(Convert.FromBase64String(b64));
        return JsonUtility.FromJson<MapData>(json);
    }
}
