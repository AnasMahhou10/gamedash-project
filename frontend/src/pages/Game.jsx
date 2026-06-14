import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import UserMenu from "../components/UserMenu";
import { getMe } from "../services/api";
import { finishMatch } from "../services/game";
import { getCurrentMatch } from "../services/matchmaking";

export default function Game() {
  const [currentUser, setCurrentUser] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [status, setStatus] = useState("Chargement...");
  const [winner, setWinner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState(null);
  const [mapId, setMapId] = useState(null);
  const [matchReady, setMatchReady] = useState(false);

  const buildUnityDeeplink = (matchPayload) => {
    const token = localStorage.getItem("token");
    if (!token || !matchPayload?.match_id) return null;

    const params = new URLSearchParams({
      match_id: String(matchPayload.match_id),
      opponent: String(matchPayload.opponent || ""),
      mode:     matchPayload.mode || "ranked",
      token,
    });

    if (currentUser?.id)    params.set("player_id", String(currentUser.id));
    if (matchPayload.map_id) params.set("map_id",   String(matchPayload.map_id));

    return `gamedash://match?${params.toString()}`;
  };

  const launchUnity = (matchPayload) => {
    const deeplink = buildUnityDeeplink(matchPayload);
    if (!deeplink) return;
    window.location.href = deeplink;
    toast.success("Lancement de Unity...");
  };

  // Chargement initial du match en cours
  useEffect(() => {
    const load = async () => {
      try {
        const me = await getMe();
        setCurrentUser(me);

        const data = (await getCurrentMatch())?.match;
        if (data) {
          setMatchId(data.match_id ?? null);
          setOpponent(data.opponent ?? null);
          setMode(data.mode ?? null);
          setMapId(data.map_id ?? null);
          setMatchReady(true);
          setStatus("Combat en cours");
          localStorage.setItem("match", JSON.stringify(data));

          // Récupérer le pseudo de l'adversaire
          if (data.opponent) {
            try {
              const token = localStorage.getItem("token");
              const res = await fetch(
                `http://127.0.0.1:8000/users/${data.opponent}/pseudo`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const json = await res.json();
              setOpponentName(json.pseudo || `Joueur ${data.opponent}`);
            } catch {
              setOpponentName(`Joueur ${data.opponent}`);
            }
          }
        } else {
          setStatus("En attente d'un adversaire...");
        }
      } catch (err) {
        console.error(err);
        setStatus("Impossible de charger le match");
      }
    };

    load();
  }, []);

  // WebSocket — écoute match_found ET match_finished pour les DEUX joueurs
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/matchmaking?token=${token}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Les DEUX joueurs reçoivent match_found → afficher le bouton en même temps
      if (data.type === "match_found") {
        setMatchId(data.match_id);
        setOpponent(data.opponent);
        setMode(data.mode);
        setMapId(data.map_id);
        setMatchReady(true);
        setStatus("Adversaire trouvé !");
        localStorage.setItem("match", JSON.stringify(data));

        // Récupérer le pseudo de l'adversaire
        if (data.opponent) {
          fetch(
            `http://127.0.0.1:8000/users/${data.opponent}/pseudo`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
            .then((r) => r.json())
            .then((json) => setOpponentName(json.pseudo || `Joueur ${data.opponent}`))
            .catch(() => setOpponentName(`Joueur ${data.opponent}`));
        }

        toast.success(`Match trouvé ! Mode : ${data.mode?.toUpperCase()}`);
      }

      // Fin de match
      if (data.type === "match_finished" && data.match_id === matchId) {
        setWinner(data.result === "win" ? "YOU" : "OPPONENT");
        setStatus(data.result === "win" ? "Victoire confirmée" : "Défaite confirmée");
        setIsSubmitting(false);
        localStorage.removeItem("match");
        setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
      }
    };

    return () => ws.close();
  }, [currentUser, matchId]);

  const handleFinish = async (winnerId, winnerLabel) => {
    if (!matchId || !winnerId) { toast.error("Match introuvable."); return; }
    try {
      setIsSubmitting(true);
      setWinner(winnerLabel);
      await finishMatch(matchId, winnerId);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de terminer le match.");
      setWinner(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-28 text-white sm:px-6">
        <div className="absolute left-0 top-0 w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl text-cyan-300 drop-shadow-[0_0_20px_rgba(0,212,255,0.35)] sm:text-4xl">
                GAME SESSION
              </h1>
              <BackToDashboardButton className="mt-4" />
            </div>
            <UserMenu user={currentUser} />
          </div>
        </div>

        {/* En attente d'adversaire */}
        {!matchReady && (
          <div className="text-center">
            <p className="text-xl text-slate-400 animate-pulse">{status}</p>
            <p className="mt-2 text-sm text-slate-500">
              En attente d'un adversaire dans le même mode...
            </p>
          </div>
        )}

        {/* Match trouvé — les DEUX joueurs voient ceci en même temps */}
        {matchReady && currentUser && (
          <div className="dashboard-card w-full max-w-4xl rounded-2xl p-5 text-center sm:p-8">
            <div className="mb-3 text-sm text-slate-400">Match ID: {matchId}</div>
            <div className="mb-8 text-sm text-slate-400">
              <p>Mode: {mode?.toUpperCase() || "—"}</p>
              <p>Map: {mapId ? `#${mapId}` : "par défaut"}</p>
            </div>

            <div className="mb-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-10">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-2xl bg-cyan-500/90 shadow-2xl shadow-cyan-500/20 animate-pulse sm:h-32 sm:w-32" />
                <p className="mt-4 text-xl">{currentUser.pseudo || "YOU"}</p>
              </div>

              <div className="text-3xl font-black text-white/90 sm:text-5xl">VS</div>

              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-2xl bg-pink-500/90 shadow-2xl shadow-pink-500/20 animate-pulse sm:h-32 sm:w-32" />
                <p className="mt-4 text-xl">{opponentName || `Joueur ${opponent}`}</p>
              </div>
            </div>

            {!winner && (
              <div className="flex flex-wrap justify-center gap-6">
                <button
                  onClick={() => launchUnity({ match_id: matchId, opponent, mode, map_id: mapId })}
                  className="nav-button nav-button-cyan"
                >
                  Relancer Unity
                </button>
                <button
                  onClick={() => handleFinish(currentUser?.id, "YOU")}
                  disabled={isSubmitting}
                  className="nav-button border-emerald-400/20 bg-emerald-500/90 text-slate-950 hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Gagner
                </button>
                <button
                  onClick={() => handleFinish(opponent, "OPPONENT")}
                  disabled={isSubmitting}
                  className="nav-button nav-button-red disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Perdre
                </button>
              </div>
            )}

            {winner && (
              <div className="mt-10 text-center">
                <h2 className={`text-4xl ${winner === "YOU" ? "animate-bounce text-green-400" : "animate-pulse text-red-400"}`}>
                  {winner === "YOU" ? "VICTOIRE !" : "DÉFAITE"}
                </h2>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}