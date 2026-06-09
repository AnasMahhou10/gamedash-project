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
  const [status, setStatus] = useState("Chargement...");
  const [winner, setWinner] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState(null);
  const [mapId, setMapId] = useState(null);

  const buildUnityMatchDeeplink = (matchPayload) => {
    const token = localStorage.getItem("token");

    if (!token || !matchPayload?.match_id) {
      return null;
    }

    const params = new URLSearchParams({
      match_id: String(matchPayload.match_id),
      opponent: String(matchPayload.opponent || ""),
      mode: matchPayload.mode || "ranked",
      token,
    });

    if (currentUser?.id) {
      params.set("player_id", String(currentUser.id));
    }

    if (matchPayload.map_id) {
      params.set("map_id", String(matchPayload.map_id));
    }

    return `gamedash://match?${params.toString()}`;
  };

  const launchUnityMatch = (matchPayload) => {
    const deeplink = buildUnityMatchDeeplink(matchPayload);

    if (!deeplink) {
      return false;
    }

    window.location.href = deeplink;
    toast.success("Ouverture de Unity avec la map du match...");
    return true;
  };

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const me = await getMe();
        setCurrentUser(me);

        const matchData = localStorage.getItem("match");
        const parsedLocalMatch = matchData ? JSON.parse(matchData) : null;
        const currentMatchData = await getCurrentMatch();
        const data = currentMatchData?.match || parsedLocalMatch;

        if (data) {
          setMatchId(data.match_id ?? null);
          setOpponent(data.opponent ?? null);
          setMode(data.mode ?? null);
          setMapId(data.map_id ?? null);
          localStorage.setItem("match", JSON.stringify(data));
          setStatus("Combat en cours");
        } else {
          setStatus("Aucun match");
        }
      } catch (error) {
        console.error(error);
        setStatus("Impossible de charger le match");
      }
    };

    loadGameData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || !currentUser || !matchId) {
      return undefined;
    }

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/matchmaking?token=${token}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "match_finished" && data.match_id === matchId) {
        setWinner(data.result === "win" ? "YOU" : "OPPONENT");
        setStatus(data.result === "win" ? "Victoire confirmee" : "Defaite confirmee");
        setIsSubmitting(false);
        localStorage.removeItem("match");

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      }
    };

    return () => ws.close();
  }, [currentUser, matchId]);

  const handleFinish = async (winnerId, winnerLabel) => {
    if (!matchId || !winnerId) {
      toast.error("Match introuvable.");
      return;
    }

    try {
      setIsSubmitting(true);
      setWinner(winnerLabel);
      await finishMatch(matchId, winnerId);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de terminer le match.");
      setWinner(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWin = async () => {
    await handleFinish(currentUser?.id, "YOU");
  };

  const handleLose = async () => {
    await handleFinish(opponent, "OPPONENT");
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

        {opponent && currentUser && (
          <div className="dashboard-card w-full max-w-4xl rounded-2xl p-5 text-center sm:p-8">
            <div className="mb-3 text-sm text-slate-400">Match ID: {matchId}</div>
            <div className="mb-8 text-sm text-slate-400">
              <p>Mode: {mode || "-"}</p>
              <p>
                Scene Unity: {mapId ? `Game avec map #${mapId}` : "Game par defaut"}
              </p>
            </div>

            <div className="mb-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-10">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-2xl bg-cyan-500/90 shadow-2xl shadow-cyan-500/20 animate-pulse sm:h-32 sm:w-32" />
                <p className="mt-4 text-xl">YOU</p>
                <p className="text-sm text-slate-400">Player {currentUser.id}</p>
              </div>

              <div className="text-3xl font-black text-white/90 sm:text-5xl">VS</div>

              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-2xl bg-pink-500/90 shadow-2xl shadow-pink-500/20 animate-pulse sm:h-32 sm:w-32" />
                <p className="mt-4 text-xl">Player {opponent}</p>
              </div>
            </div>

            {!winner && (
              <div className="flex flex-wrap justify-center gap-6">
                <button
                  onClick={() =>
                    launchUnityMatch({
                      match_id: matchId,
                      opponent,
                      mode,
                      map_id: mapId,
                    })
                  }
                  className="nav-button nav-button-cyan"
                >
                  Relancer Unity
                </button>

                <button
                  onClick={handleWin}
                  disabled={isSubmitting}
                  className="nav-button border-emerald-400/20 bg-emerald-500/90 text-slate-950 hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Gagner
                </button>

                <button
                  onClick={handleLose}
                  disabled={isSubmitting}
                  className="nav-button nav-button-red disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Perdre
                </button>
              </div>
            )}

            {winner && (
              <div className="mt-10 text-center">
                <h2
                  className={`text-4xl ${
                    winner === "YOU"
                      ? "animate-bounce text-green-400"
                      : "animate-pulse text-red-400"
                  }`}
                >
                  {winner === "YOU" ? "VICTOIRE !" : "DEFAITE"}
                </h2>
              </div>
            )}
          </div>
        )}

        {(!opponent || !currentUser) && <p>{status}</p>}
      </div>
    </PageWrapper>
  );
}
