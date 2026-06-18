import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import { getMe } from "../services/api";
import {
  commentMap,
  createMap,
  deleteMap,
  getCreatorStats,
  getMaps,
  getMyMaps,
  reportMap,
  testMap,
  toggleFavoriteMap,
  updateMap,
  voteMap,
} from "../services/maps";

const STATUS_OPTIONS = ["draft", "beta", "stable"];
const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "top", label: "Top Rated" },
  { value: "favorites", label: "Most Favorited" },
  { value: "tested", label: "Most Tested" },
  { value: "newest", label: "Newest" },
];

const filesToDataUrls = async (files) =>
  Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );

export default function Maps() {
  const [maps, setMaps] = useState([]);
  const [myMaps, setMyMaps] = useState([]);
  const [showMyMaps, setShowMyMaps] = useState(false);
  const [creatorStats, setCreatorStats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [sort, setSort] = useState("trending");
  const [author, setAuthor] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [reportDrafts, setReportDrafts] = useState({});
  const [mapContent, setMapContent] = useState("");
  const [generatedMapContent, setGeneratedMapContent] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [publishAuto, setPublishAuto] = useState(false);
  const [gridWidth, setGridWidth] = useState(16);
  const [gridHeight, setGridHeight] = useState(12);
  const [grid, setGrid] = useState(null); // will be 2D array
  const [selectedTile, setSelectedTile] = useState(1);
  const [isPainting, setIsPainting] = useState(false);

  const TileColors = ["#222222","#8b5a2b","#2e7d32","#0b79e6","#e11d48","#f59e0b"];
  const TileNames = ["Vide","Mur","Sol","Spawn J1","Spawn J2","Powerup"];

  const initGrid = (w = gridWidth, h = gridHeight) => {
    const g = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
    setGrid(g);
  };

  // initialize when editor opened or sizes changed
  useEffect(() => {
    if (showEditor && !grid) initGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEditor]);

  const paintCell = (x, y) => {
    if (!grid) return;
    const g = grid.map((row) => row.slice());
    g[y][x] = selectedTile;
    setGrid(g);
  };

  useEffect(() => {
    const stopPainting = () => setIsPainting(false);

    window.addEventListener("mouseup", stopPainting);
    window.addEventListener("mouseleave", stopPainting);

    return () => {
      window.removeEventListener("mouseup", stopPainting);
      window.removeEventListener("mouseleave", stopPainting);
    };
  }, []);

  const clearGrid = () => {
    initGrid(gridWidth, gridHeight);
  };

  const generateMapJson = () => {
    if (!grid) return null;
    const cells = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const t = grid[y][x];
        if (t && t !== 0) cells.push({ x, y, type: t });
      }
    }
    const mapObj = {
      name: title || "Ma map",
      description: description || "",
      width: grid[0].length,
      height: grid.length,
      cells,
    };
    return mapObj;
  };

  const setEditorAsContent = () => {
    const mapObj = generateMapJson();
    if (!mapObj) {
      toast.error("Rien a generer dans l'editeur.");
      return;
    }
    const json = JSON.stringify(mapObj);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    setGeneratedMapContent(b64);
    toast.success("Contenu de la map genere et ajoute au formulaire.");
    setShowEditor(false);
  };

  const importExample = () => {
    // demo map: border walls, interior floor, spawns
    const w = 16;
    const h = 12;
    setGridWidth(w);
    setGridHeight(h);
    const g = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
    // borders
    for (let x = 0; x < w; x++) { g[0][x] = 1; g[h-1][x] = 1; }
    for (let y = 1; y < h-1; y++) { g[y][0] = 1; g[y][w-1] = 1; }
    // interior floor
    for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) g[y][x] = 2;
    // spawns
    g[2][2] = 3;
    g[9][13] = 4;
    setGrid(g);
    setTitle("Exemple automatique");
    setDescription("Map generee automatiquement (exemple)");
    // generate and set as content
    const cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = g[y][x]; if (t && t !== 0) cells.push({ x, y, type: t }); }
    const mapObj = { name: "Exemple automatique", description: "Map generee automatiquement", width: w, height: h, cells };
    const json = JSON.stringify(mapObj);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    setGeneratedMapContent(b64);
    toast.success("Exemple importe et pre-rempli.");
    // optionally publish automatically
    if (publishAuto) {
      publishGeneratedMap(b64);
    }
  };

  const publishGeneratedMap = async (overrideContent) => {
    try {
      const payloadContent = overrideContent || generatedMapContent || mapContent || null;
      if (!payloadContent) { toast.error("Aucun contenu genere pour publication."); return; }
      let cleaned = payloadContent;
      if (typeof cleaned === "string" && cleaned.startsWith("data:")) {
        const idx = cleaned.indexOf("base64,");
        if (idx >= 0) cleaned = cleaned.substring(idx + 7);
      }
      await createMap({
        title: title || "Ma map",
        description: description || "",
        status,
        tags: tags.split(",").map((tagName) => tagName.trim()).filter(Boolean),
        content_url: cleaned,
        screenshot_urls: mapScreenshots,
      });
      toast.success("Map publiee automatiquement.");
      setTitle(""); setDescription(""); setStatus("draft"); setTags(""); setMapContent(""); setGeneratedMapContent(""); setMapScreenshots([]);
      await load();
    } catch (err) {
      console.error(err);
      toast.error("Echec de la publication automatique.");
    }
  };
  const [mapScreenshots, setMapScreenshots] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getMe();
        setCurrentUser(user);
        await loadMyMaps();
      } catch (error) {
        console.error(error);
      }
    };
    loadUser();
  }, []);

  const loadMyMaps = async () => {
    try {
      const mapsData = await getMyMaps();
      setMyMaps(mapsData);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger tes maps.");
    }
  };

  useEffect(() => {
    load();
  }, [search, selectedStatus, selectedTag, sort, author]);

  const load = async () => {
    try {
      const [mapsData, creatorData] = await Promise.all([
        getMaps({
          q: search,
          status: selectedStatus,
          tag: selectedTag,
          sort,
          author,
        }),
        getCreatorStats(),
      ]);
      setMaps(mapsData);
      setCreatorStats(creatorData);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les maps.");
    }
  };

  const availableTags = useMemo(() => {
    const unique = new Set();
    maps.forEach((map) => map.tags.forEach((tag) => unique.add(tag)));
    return Array.from(unique).sort();
  }, [maps]);

  const handleScreenshotUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    try {
      const uploads = await filesToDataUrls(files);
      setMapScreenshots(uploads.slice(0, 4));
      toast.success("Captures chargees.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les captures.");
    }
  };

  const handleMapContentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      // If the uploaded file is a JSON map, read as text and encode to base64 (UTF-8)
      const isJson = file.type === "application/json" || file.name.endsWith(".json");
      if (isJson) {
        const text = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsText(file, "utf-8");
        });

        // validate JSON
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error("Fichier JSON invalide");
        }

        // encode as base64 (UTF-8) so Unity's MapData.FromBase64 can decode it
        const json = JSON.stringify(parsed);
        const b64 = btoa(unescape(encodeURIComponent(json)));
        setMapContent(b64);
        toast.success("Contenu map (JSON) importe et encodé.");
      } else {
        // fallback: read as data URL (e.g., already base64), remove prefix if present
        const [content] = await filesToDataUrls([file]);
        // data:*;base64,XXXXX
        const idx = content.indexOf("base64,");
        const payload = idx >= 0 ? content.substring(idx + 7) : content;
        setMapContent(payload);
        toast.success("Contenu map importe.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger le contenu map.");
    }
  };

  const handleCreateMap = async (e) => {
    e.preventDefault();

    try {
      // Accept either generated editor content or uploaded content
      if (!generatedMapContent && !mapContent) {
        toast.error("Ajoute le contenu de la map (fichier JSON) ou utilise l'editeur avant de publier.");
        return;
      }

      // Prepare payload content (generated takes precedence)
      let payloadContent = generatedMapContent || mapContent;
      if (typeof payloadContent === "string" && payloadContent.startsWith("data:")) {
        const idx = payloadContent.indexOf("base64,");
        if (idx >= 0) payloadContent = payloadContent.substring(idx + 7);
      }
      await createMap({
        title,
        description,
        status,
        tags: tags.split(",").map((tagName) => tagName.trim()).filter(Boolean),
        content_url: payloadContent,
        screenshot_urls: mapScreenshots,
      });
      toast.success("Map publiee.");
      setTitle("");
      setDescription("");
      setStatus("draft");
      setTags("");
      setMapContent("");
      setGeneratedMapContent("");
      setMapScreenshots([]);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de creer la map.");
    }
  };

  const handleVote = async (mapId, value) => {
    try {
      await voteMap(mapId, value);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'enregistrer le vote.");
    }
  };

  const handleFavorite = async (mapId) => {
    try {
      const result = await toggleFavoriteMap(mapId);
      toast.success(result.is_favorited ? "Ajoute aux favoris." : "Retire des favoris.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre a jour les favoris.");
    }
  };

  const handleComment = async (mapId) => {
    try {
      await commentMap(mapId, commentDrafts[mapId] || "");
      toast.success("Commentaire ajoute.");
      setCommentDrafts((prev) => ({ ...prev, [mapId]: "" }));
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'ajouter le commentaire.");
    }
  };

  const handleTestMap = async (mapId) => {
  const token = localStorage.getItem("token");

  if (!token) {
    toast.error("Tu dois être connecté pour tester une map.");
    return;
  }

  
  const deeplink = `gamedash://testmap?map_id=${mapId}&token=${encodeURIComponent(token)}`;

  
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = deeplink;
  document.body.appendChild(iframe);

  
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);

  toast(
    (t) => (
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-white">Ouverture de Unity...</p>
        <p className="text-sm text-slate-300">
          Si Unity ne s'ouvre pas, clique sur <strong>"Ouvrir GameDash"</strong> dans la
          fenêtre qui s'est affichée.
        </p>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="mt-1 rounded-lg bg-cyan-500 px-3 py-1 text-sm font-semibold text-slate-950"
        >
          OK
        </button>
      </div>
    ),
    { duration: 6000 }
  );

  
  setTimeout(async () => {
    try {
      await testMap(mapId, 300, 1.0);
      await load(); // refresh les stats de la map
    } catch (err) {
      console.warn("Impossible d'enregistrer le test API :", err);
    }
  }, 4000);
};

  const handleReportMap = async (mapId) => {
    try {
      await reportMap(mapId, reportDrafts[mapId] || "Contenu a revoir");
      toast.success("Signalement envoye.");
      setReportDrafts((prev) => ({ ...prev, [mapId]: "" }));
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'envoyer le signalement.");
    }
  };

  const handleDeleteMap = async (mapId) => {
    if (window.confirm("Confirmation: Supprimer cette map ?")) {
      try {
        await deleteMap(mapId);
        toast.success("Map supprimee.");
        await loadMyMaps();
        await load();
      } catch (error) {
        console.error(error);
        toast.error("Impossible de supprimer la map.");
      }
    }
  };

  const handleUpdateMapTitle = async (mapId) => {
    const newTitle = prompt("Nouveau titre :", myMaps.find((m) => m.id === mapId)?.title || "");
    if (newTitle && newTitle.trim()) {
      try {
        await updateMap(mapId, { title: newTitle.trim() });
        toast.success("Titre mis a jour.");
        await loadMyMaps();
        await load();
      } catch (error) {
        console.error(error);
        toast.error("Impossible de mettre a jour le titre.");
      }
    }
  };

  return (
    <PageWrapper>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl text-purple-300 drop-shadow-[0_0_20px_rgba(192,132,252,0.35)] sm:text-4xl">
            GameDash Community Hub
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Explore les maps communautaires, publie du vrai contenu, suis les tests et
            mets les createurs en avant.
          </p>
          <BackToDashboardButton className="mt-4" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="dashboard-card rounded-2xl p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="tiny-label text-purple-300/70">Discover</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Map Browser</h2>
              </div>
              <div className="w-fit rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
                {maps.length} maps visibles
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche"
                className="form-control"
              />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-control"
              >
                <option value="">Tous les statuts</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="form-control"
              >
                <option value="">Tous les tags</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="form-control"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Auteur"
                className="form-control"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMyMaps(!showMyMaps)}
              className="mt-4 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-3 font-semibold text-pink-300 transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-pink-500/20"
            >
              {showMyMaps ? "Masquer mes maps" : "Afficher mes maps"} ({myMaps.length})
            </button>
          </div>

          {showMyMaps && (
            <div className="dashboard-card rounded-2xl p-5 sm:p-6">
              <p className="tiny-label text-pink-300/70">Creator</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Mes maps publiees</h2>
              <div className="mt-5 space-y-3">
                {myMaps.length > 0 ? (
                  myMaps.map((map) => (
                    <div key={map.id} className="soft-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-white">{map.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Statut: {map.status} | Tests: {map.tests_count} | Score: {map.score}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleUpdateMapTitle(map.id)}
                          className="nav-button nav-button-cyan min-h-0 px-3 py-2 text-sm"
                        >
                          Renommer
                        </button>
                        <button
                          onClick={() => handleDeleteMap(map.id)}
                          className="nav-button nav-button-red min-h-0 px-3 py-2 text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Aucune map creee pour le moment.</p>
                )}
              </div>
            </div>
          )}

          <div className="dashboard-card rounded-2xl p-5 sm:p-6">
            <p className="tiny-label text-pink-300/70">Top creators</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Createurs a suivre</h2>
            <div className="mt-5 space-y-3">
              {creatorStats.slice(0, 4).map((creator) => (
                <div key={creator.creator} className="soft-panel p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{creator.creator}</p>
                      <p className="text-sm text-slate-400">
                        {creator.maps_published} maps | {creator.tests_count} tests
                      </p>
                    </div>
                    <div className="rounded-full bg-purple-500/10 px-3 py-2 text-sm text-purple-200">
                      Pop {creator.popularity}
                    </div>
                  </div>
                </div>
              ))}
              {creatorStats.length === 0 && <p className="text-sm text-slate-500">Aucun createur classe pour le moment.</p>}
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateMap} className="mb-8 dashboard-card rounded-2xl p-5 sm:p-6">
          <p className="tiny-label">Creator Studio</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Publier une nouvelle map</h2>
          <div className="mt-5 grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la map"
                className="form-control"
                required
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-control"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'experience"
              rows={4}
              className="form-control"
              required
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tags: duel, arena, cyber"
                className="form-control"
              />
              <label className="soft-panel px-4 py-3 text-sm text-slate-300">
                Captures d'ecran
                <input type="file" accept="image/*" multiple onChange={handleScreenshotUpload} className="mt-2 block w-full text-xs" />
              </label>
              <label className="soft-panel px-4 py-3 text-sm text-slate-300">
                Contenu map
                <input type="file" onChange={handleMapContentUpload} className="mt-2 block w-full text-xs" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setShowEditor((s) => !s)} className="nav-button nav-button-purple min-h-0 px-3 py-2 text-sm">{showEditor ? 'Fermer l\'editeur' : 'Ouvrir editeur de grille'}</button>
                  <button type="button" onClick={() => { setMapContent(''); setGeneratedMapContent(''); toast.success('Contenu supprime.'); }} className="nav-button nav-button-red min-h-0 px-3 py-2 text-sm">Supprimer contenu</button>
                  <button type="button" onClick={importExample} className="nav-button nav-button-cyan min-h-0 px-3 py-2 text-sm">Importer exemple</button>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"><input type="checkbox" checked={publishAuto} onChange={(e)=>setPublishAuto(e.target.checked)} /> Publier automatiquement</label>
                </div>
              </label>
            </div>

            {showEditor && (
              <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-slate-950/70 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <label className="text-sm text-slate-300">Width</label>
                  <input type="number" value={gridWidth} onChange={(e) => setGridWidth(Number(e.target.value))} className="form-control w-24 py-2" />
                  <label className="text-sm text-slate-300">Height</label>
                  <input type="number" value={gridHeight} onChange={(e) => setGridHeight(Number(e.target.value))} className="form-control w-24 py-2" />
                  <button type="button" onClick={() => initGrid(gridWidth, gridHeight)} className="nav-button nav-button-cyan min-h-0 px-3 py-2 text-sm">Init</button>
                  <button type="button" onClick={clearGrid} className="nav-button nav-button-amber min-h-0 px-3 py-2 text-sm">Clear</button>
                  <button type="button" onClick={setEditorAsContent} className="nav-button border-emerald-400/20 bg-emerald-500/90 text-slate-950 min-h-0 px-3 py-2 text-sm sm:ml-auto">Generer et utiliser</button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {TileNames.map((n, idx) => (
                    <button key={n} type="button" onClick={() => setSelectedTile(idx)} className={`rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${selectedTile===idx? 'ring-2 ring-white':''}`} style={{background: TileColors[idx], color: '#fff'}}>{n}</button>
                  ))}
                </div>
                <div className="overflow-auto" style={{ maxWidth: '100%', maxHeight: 400 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridWidth}, 24px)`, gap: 2 }}>
                    {Array.from({ length: gridHeight }).map((_, y) => (
                      <React.Fragment key={y}>
                        {Array.from({ length: gridWidth }).map((__, x) => {
                          const val = grid?.[y]?.[x] ?? 0;
                          return (
                            <button
                              key={`${x}-${y}`}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setIsPainting(true);
                                paintCell(x, y);
                              }}
                              onMouseEnter={() => {
                                if (isPainting) {
                                  paintCell(x, y);
                                }
                              }}
                              onMouseUp={() => setIsPainting(false)}
                              style={{ width: 24, height: 24, background: TileColors[val], borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {mapScreenshots.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {mapScreenshots.map((shot, index) => (
                  <img key={`${index}-${shot.slice(0, 10)}`} src={shot} alt={`Screenshot ${index + 1}`} className="h-20 w-32 rounded-2xl object-cover" />
                ))}
              </div>
            )}
            <button
              type="submit"
              className="nav-button border-cyan-300/20 bg-cyan-400 text-slate-950 hover:shadow-cyan-500/20"
            >
              Publier la map
            </button>
          </div>
        </form>

        <div className="space-y-6">
          {maps.map((map) => (
            <div key={map.id} className="dashboard-card overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-bold text-white">{map.title}</h2>
                    {currentUser && map.author.id === currentUser.id && (
                      <span className="rounded-full border border-pink-400/30 bg-pink-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-pink-300 font-bold">
                        [MA MAP]
                      </span>
                    )}
                    <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-purple-300">
                      {map.status}
                    </span>
                    {map.featured && (
                      <span className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-yellow-300">
                        featured
                      </span>
                    )}
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                      by {map.author.pseudo}
                    </span>
                  </div>

                  <p className="mt-4 max-w-4xl text-slate-300">{map.description}</p>

                  {map.screenshots?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {map.screenshots.map((shot, index) => (
                        <img key={`${map.id}-shot-${index}`} src={shot} alt={`${map.title} screenshot ${index + 1}`} className="h-28 w-44 rounded-2xl object-cover" />
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {map.tags.length > 0 ? (
                      map.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
                        >
                          #{tag}
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">Aucun tag</span>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-6">
                    {[
                      ["Score", map.score, "text-yellow-300"],
                      ["Likes", map.likes, "text-emerald-300"],
                      ["Favoris", map.favorites, "text-pink-300"],
                      ["Tests", map.tests_count, "text-cyan-300"],
                      ["Note moyenne", map.average_rating, "text-orange-300"],
                      ["Retention", map.retention_score, "text-purple-300"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                        <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">Versions</p>
                      <div className="space-y-2">
                        {map.versions.map((version) => (
                          <div key={version.id} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-cyan-300">{version.version}</p>
                              <p className="text-xs text-slate-500">{new Date(version.created_at).toLocaleDateString()}</p>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">{version.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">Creator stats</p>
                      <div className="space-y-2 text-sm text-slate-300">
                        <p>Maps publiees: {map.author.stats.maps_published}</p>
                        <p>Tests cumules: {map.author.stats.tests_count}</p>
                        <p>Popularite createur: {map.author.stats.popularity}</p>
                        <p>Derniere mise a jour: {map.last_updated_at ? new Date(map.last_updated_at).toLocaleDateString() : "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-cyan-500/20 bg-white/5 p-5">
                    <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">Reactions</p>
                    <div className="grid grid-cols-4 gap-3">
                      <button onClick={() => handleVote(map.id, 1)} className={`rounded-2xl px-4 py-3 text-xl transition ${map.user_vote === 1 ? "bg-emerald-500 text-slate-950" : "bg-emerald-500/20 hover:scale-105"}`}>+</button>
                      <button onClick={() => handleVote(map.id, -1)} className={`rounded-2xl px-4 py-3 text-xl transition ${map.user_vote === -1 ? "bg-rose-500 text-white" : "bg-rose-500/20 hover:scale-105"}`}>-</button>
                      <button onClick={() => handleFavorite(map.id)} className={`rounded-2xl px-4 py-3 text-xl transition ${map.is_favorited ? "bg-yellow-400 text-slate-950" : "bg-yellow-400/20 hover:scale-105"}`}>*</button>
                      <button onClick={() => handleTestMap(map.id)} className="rounded-2xl bg-cyan-500/20 px-4 py-3 text-sm font-semibold transition hover:scale-105">Test</button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-pink-500/20 bg-white/5 p-5">
                    <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">Commentaire</p>
                    <textarea
                      value={commentDrafts[map.id] || ""}
                      onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [map.id]: e.target.value }))}
                      rows={3}
                      placeholder="Votre retour sur la map"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none"
                    />
                    <button onClick={() => handleComment(map.id)} className="mt-3 w-full rounded-2xl bg-pink-500 px-4 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]">
                      Envoyer le commentaire
                    </button>
                  </div>

                  <div className="rounded-3xl border border-yellow-500/20 bg-white/5 p-5">
                    <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">Signaler cette map</p>
                    <textarea
                      value={reportDrafts[map.id] || ""}
                      onChange={(e) => setReportDrafts((prev) => ({ ...prev, [map.id]: e.target.value }))}
                      rows={2}
                      placeholder="Raison du signalement"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none"
                    />
                    <button onClick={() => handleReportMap(map.id)} className="mt-3 w-full rounded-2xl bg-yellow-400 px-4 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]">
                      Signaler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
