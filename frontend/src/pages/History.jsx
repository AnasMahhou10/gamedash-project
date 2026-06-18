import { useEffect, useState } from "react";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import { getMe } from "../services/api";
import { getHistory } from "../services/match";

export default function History() {
  const [matches, setMatches] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    mode: "",
    period: "",
    player: "",
  });

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const [history, me] = await Promise.all([getHistory(filters), getMe()]);
        setMatches(history);
        setCurrentUser(me);
      } catch (error) {
        console.error("Unable to load history", error);
      }
    };

    loadHistory();
  }, [filters.mode, filters.period, filters.player]);

  return (
    <PageWrapper>
      <div>
        <div className="mb-10">
          <h1 className="bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
            MATCH HISTORY
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Filtre par mode, periode ou joueur, puis analyse les gains MMR, XP et la
            physionomie de chaque match.
          </p>
          <BackToDashboardButton className="mt-4" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-3">
          <select
            value={filters.mode}
            onChange={(e) => setFilters((prev) => ({ ...prev, mode: e.target.value }))}
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          >
            <option value="">Tous les modes</option>
            <option value="ranked">Classe</option>
            <option value="unranked">Non classe</option>
            <option value="fun">Fun</option>
          </select>

          <select
            value={filters.period}
            onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          >
            <option value="">Toute la periode</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>

          <input
            value={filters.player}
            onChange={(e) => setFilters((prev) => ({ ...prev, player: e.target.value }))}
            placeholder="Rechercher un joueur"
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="mx-auto max-w-5xl space-y-6">
          {matches.map((match) => (
            <div
              key={match.match_id}
              className={`rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] ${
                match.result === "win"
                  ? "border-green-400 bg-green-500/10 shadow-lg shadow-green-500/20"
                  : match.result === "lose"
                    ? "border-red-400 bg-red-500/10 shadow-lg shadow-red-500/20"
                    : "border-yellow-400 bg-yellow-500/10"
              }`}
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {match.player1_name} vs {match.player2_name}
                      </p>
                      <p className="mt-1 text-sm uppercase tracking-[0.25em] text-slate-400">
                        {match.mode}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(match.date).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resultat</p>
                      <p className="mt-2 text-xl font-bold text-white">{match.result}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Duree</p>
                      <p className="mt-2 text-xl font-bold text-white">{match.duration_label}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Delta MMR</p>
                      <p className={`mt-2 text-xl font-bold ${match.elo_delta >= 0 ? "text-green-300" : "text-red-300"}`}>
                        {match.elo_delta >= 0 ? `+${match.elo_delta}` : match.elo_delta}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">XP gagnee</p>
                      <p className="mt-2 text-xl font-bold text-cyan-300">+{match.xp_gain}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Details</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <p>Match ID: {match.match_id}</p>
                    <p>Adversaire: {match.opponent_name}</p>
                    <p>Pression: {match.details.pressure}</p>
                    <p>Intensity score: {match.details.intensity_score}/10</p>
                    <p>
                      Winner:{" "}
                      {match.winner === match.player1 ? match.player1_name : match.winner === match.player2 ? match.player2_name : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {matches.length === 0 && (
            <p className="mt-20 text-center text-gray-400">
              Aucun match ne correspond aux filtres actuels.
            </p>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
