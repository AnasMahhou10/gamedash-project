import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import UserMenu from "../components/UserMenu";
import { getMe } from "../services/api";
import {
  createMatch,
  getCurrentMatch,
  getMatchmakingOverview,
  getMatchmakingSettings,
  joinQueue,
  leaveQueue,
} from "../services/matchmaking";

const MODES = [
  {
    value: "ranked",
    label: "Classe",
    description: "MMR actif, matchmaking competitif et impact ELO complet.",
  },
  {
    value: "unranked",
    label: "Non classe",
    description: "Entrainement propre avec files dediees et pression reduite.",
  },
  {
    value: "fun",
    label: "Fun",
    description: "Parties rapides et plus permissives pour jouer sans pression.",
  },
];

export default function Matchmaking() {
  const [status, setStatus] = useState("Idle");
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMode, setSelectedMode] = useState("ranked");
  const [settings, setSettings] = useState(null);
  const [overview, setOverview] = useState(null);
  const [queuedMode, setQueuedMode] = useState(null);

  const findQueuedMode = (overviewData, userId) => {
    if (!overviewData || !userId) {
      return null;
    }

    return (
      MODES.find((mode) =>
        (overviewData.queue?.[mode.value] || []).some((entry) => entry.user_id === userId)
      )?.value || null
    );
  };

  const redirectToGame = (matchPayload) => {
    setMatch(matchPayload);
    localStorage.setItem("match", JSON.stringify(matchPayload));
    window.location.href = "/game";
  };

  const refreshData = async () => {
    // load user if available, but don't fail the whole flow if not logged
    let me = null;
    let activeQueueMode = null;
    try {
      me = await getMe();
      setCurrentUser(me);
    } catch {
      // not authenticated or user fetch failed
      setCurrentUser(null);
    }

    // load settings and overview (public)
    try {
      const [settingsData, overviewData] = await Promise.all([
        getMatchmakingSettings(),
        getMatchmakingOverview(),
      ]);
      setSettings(settingsData.settings);
      setOverview(overviewData);

      activeQueueMode = findQueuedMode(overviewData, me?.id);
      setQueuedMode(activeQueueMode);
      if (activeQueueMode) {
        setSelectedMode(activeQueueMode);
      }
    } catch (err) {
      console.error("Failed to load matchmaking settings/overview", err);
      toast.error("Impossible de charger les paramètres du matchmaking.");
      return;
    }

    // if user is logged, check current match
    if (me) {
      try {
        const currentMatchData = await getCurrentMatch();
        if (currentMatchData?.match) {
          setStatus("Match en cours");
          redirectToGame(currentMatchData.match);
          return;
        }
      } catch (err) {
        console.warn("Unable to fetch current match", err);
      }
    }

    setStatus(
      me
        ? me.player_status === "queue" || activeQueueMode
          ? "En file d'attente"
          : me.player_status === "in_game"
            ? "Match en cours"
            : "Pret a lancer une recherche"
        : "Pret a lancer une recherche"
    );
  };

  useEffect(() => {
    refreshData();

    const token = localStorage.getItem("token");
    const wsUrl = token ? `ws://127.0.0.1:8000/ws/matchmaking?token=${token}` : `ws://127.0.0.1:8000/ws/matchmaking`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "match_found") {
        toast.success(`Match trouve en mode ${data.mode || "ranked"} !`);
        redirectToGame(data);
      }

      if (data.type === "player_state") {
        setCurrentUser((prev) => (prev ? { ...prev, player_status: data.player_status } : prev));
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (currentUser?.player_status !== "queue" && !queuedMode) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const modeToMatch = queuedMode || selectedMode;
        const res = await createMatch(modeToMatch);

        if (res?.match_id) {
          const matchPayload = {
            match_id: res.match_id,
            opponent:
              currentUser?.id === res.players?.[0] ? res.players?.[1] : res.players?.[0],
            mode: res.mode || modeToMatch,
            status: "in_game",
          };

          toast.success(`Match trouve en mode ${res.mode || modeToMatch} !`);
          redirectToGame(matchPayload);
        } else {
          await refreshData();
        }
      } catch (error) {
        console.error(error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser?.player_status, currentUser?.id, queuedMode, selectedMode]);

  const handleJoin = async () => {
    try {
      setLoading(true);
      const res = await joinQueue(selectedMode);

      if (res.match_id) {
        const matchPayload = {
          match_id: res.match_id,
          opponent:
            currentUser?.id === res.players?.[0] ? res.players?.[1] : res.players?.[0],
          mode: res.mode || selectedMode,
          status: "in_game",
        };

        toast.success(`Match trouve en mode ${res.mode || selectedMode} !`);
        redirectToGame(matchPayload);
        return;
      }

      setStatus(res.message);
      setCurrentUser((prev) =>
        prev ? { ...prev, player_status: res.player_status || "queue" } : prev
      );
      setQueuedMode(res.mode || selectedMode);
      toast.success(res.message || "Recherche lancee");
      await refreshData();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de rejoindre la file");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    try {
      const res = await leaveQueue();
      setStatus(res.message);
      setCurrentUser((prev) =>
        prev ? { ...prev, player_status: res.player_status || "online" } : prev
      );
      setQueuedMode(null);
      toast.success(res.message || "File quittee");
      await refreshData();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de quitter la file");
    }
  };

  const selectedModeEnabled =
    selectedMode === "ranked"
      ? settings?.modes?.ranked
      : selectedMode === "unranked"
        ? settings?.modes?.unranked
        : settings?.modes?.fun;

  return (
    <PageWrapper>
      <div className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl text-cyan-300 drop-shadow-[0_0_20px_rgba(0,212,255,0.35)] sm:text-4xl">
              GameDash Matchmaking
            </h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Choisis une file, surveille l'etat des joueurs et lance une recherche
              qui prend en compte l'ELO, le mode et le temps d'attente maximum.
            </p>
            <BackToDashboardButton className="mt-4" />
          </div>
          <UserMenu user={currentUser} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="dashboard-card rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="tiny-label">
                  Modes
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Plusieurs files de jeu
                </h2>
              </div>
              <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
                Etat joueur: {currentUser?.player_status || "online"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {MODES.map((mode) => {
                const enabled =
                  mode.value === "ranked"
                    ? settings?.modes?.ranked
                    : mode.value === "unranked"
                      ? settings?.modes?.unranked
                      : settings?.modes?.fun;

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setSelectedMode(mode.value)}
                    className={`rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                      selectedMode === mode.value
                        ? "border-cyan-400 bg-cyan-500/10 shadow-xl shadow-cyan-500/20"
                        : "border-white/10 bg-white/5 hover:border-cyan-400/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold text-white">{mode.label}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                          enabled
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {enabled ? "Actif" : "Off"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{mode.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={handleJoin}
                disabled={loading || !selectedModeEnabled}
                className="nav-button nav-button-cyan disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Recherche..." : `Rejoindre ${selectedMode}`}
              </button>

              <button
                onClick={handleLeave}
                className="nav-button nav-button-red"
              >
                Quitter la file
              </button>
            </div>
          </div>

          <div className="dashboard-card rounded-2xl p-5 sm:p-6">
            <p className="tiny-label text-pink-300/70">Configuration live</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Parametres actifs</h2>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="soft-panel p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Statut</p>
                <p className="mt-2 text-xl text-white">{status}</p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ecart ELO max</p>
                <p className="mt-2 text-xl text-cyan-300">{settings?.max_elo_gap ?? "-"}</p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Attente max</p>
                <p className="mt-2 text-xl text-yellow-300">
                  {settings?.max_wait_seconds ?? "-"} sec
                </p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Taille equipe</p>
                <p className="mt-2 text-xl text-pink-300">{settings?.team_size ?? "-"}</p>
              </div>
            </div>

            {match && (
              <div className="mt-6 rounded-xl border border-cyan-500/30 bg-white/5 p-6">
                <h2 className="mb-2 text-2xl text-cyan-300">Match trouve</h2>
                <p>Opponent: {match.opponent}</p>
                <p className="mt-2 text-slate-400">Mode: {match.mode}</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card rounded-2xl p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="tiny-label">Monitoring</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Vue des files en temps reel</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-300">
                Online: {overview?.players_by_state?.online ?? 0}
              </span>
              <span className="rounded-full bg-yellow-500/10 px-4 py-2 text-yellow-300">
                Queue: {overview?.players_by_state?.queue ?? 0}
              </span>
              <span className="rounded-full bg-pink-500/10 px-4 py-2 text-pink-300">
                In-game: {overview?.players_by_state?.in_game ?? 0}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {MODES.map((mode) => (
              <div key={mode.value} className="soft-panel p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{mode.label}</h3>
                  <span className="text-sm text-slate-400">
                    {overview?.queue?.[mode.value]?.length ?? 0} en file
                  </span>
                </div>

                <div className="space-y-3">
                  {(overview?.queue?.[mode.value] || []).slice(0, 5).map((entry) => (
                    <div
                      key={entry.queue_id}
                      className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-cyan-200">{entry.pseudo}</p>
                        <p className="text-xs text-slate-500">{entry.waited_seconds}s</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">ELO {entry.elo}</p>
                    </div>
                  ))}

                  {(overview?.queue?.[mode.value] || []).length === 0 && (
                    <p className="text-sm text-slate-500">Aucun joueur dans cette file.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
