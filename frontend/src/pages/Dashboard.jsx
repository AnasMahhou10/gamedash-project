import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageWrapper from "../components/PageWrapper";
import UserMenu from "../components/UserMenu";
import { getMe } from "../services/api";
import {
  getDashboardSummary,
  getLeaderboard,
  getMyQuests,
  getPlayerWinrate,
  getRankDistribution,
} from "../services/dashboard";

const rankColors = {
  Bronze: "#fb923c",
  Silver: "#cbd5e1",
  Gold: "#facc15",
  Platinum: "#22d3ee",
  Diamond: "#a855f7",
};

export default function Dashboard() {
  const [status, setStatus] = useState("Connexion...");
  const [playerStatus, setPlayerStatus] = useState("online");
  const [players, setPlayers] = useState(0);
  const [elo, setElo] = useState(0);
  const [rank, setRank] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankDistribution, setRankDistribution] = useState([]);
  const [quests, setQuests] = useState([]);
  const [winrate, setWinrate] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getMe();
        setCurrentUser(me);
        setElo(me.ranked_elo ?? me.elo ?? 0);
        setRank(me.rank ?? "");
        setPlayerStatus(me.player_status ?? "online");

        const [summaryData, leaderboardData, distributionData, questsData, winrateData] =
          await Promise.all([
            getDashboardSummary(),
            getLeaderboard("ranked"),
            getRankDistribution(),
            getMyQuests(),
            getPlayerWinrate(me.id),
          ]);

        setSummary(summaryData);
        setLeaderboard(leaderboardData);
        setRankDistribution(
          Object.entries(distributionData.distribution || {}).map(([label, value]) => ({
            label,
            value,
            color: rankColors[label.split(" ")[0]] || "#22d3ee",
          }))
        );
        setQuests(questsData.quests || []);
        setWinrate(winrateData);
      } catch (error) {
        console.error("Unable to load dashboard data", error);
      }
    };

    load();

    const token = localStorage.getItem("token");
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/matchmaking?token=${token}`);

    ws.onopen = () => {
      setStatus("Connecte au serveur");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "stats") {
        setPlayers(data.players);
      }

      if (data.type === "elo") {
        setElo(data.elo);
        setRank(data.rank ?? "");
      }

      if (data.type === "player_state") {
        setPlayerStatus(data.player_status ?? "online");
      }
    };

    ws.onclose = () => {
      setStatus("Deconnecte");
    };

    return () => ws.close();
  }, []);

  const currentXpPercent = summary
    ? Math.min(100, (summary.xp / Math.max(summary.xp_needed_for_next_level, 1)) * 100)
    : 0;

  const mmrByMode = summary?.mmr_by_mode
    ? Object.entries(summary.mmr_by_mode).map(([mode, value]) => ({
        mode,
        elo: value,
      }))
    : Object.entries(currentUser?.mmr_by_mode || {}).map(([mode, value]) => ({
        mode,
        elo: typeof value === "object" ? value.elo : value,
      }));
  
  // Map editor deeplink removed: map publishing is handled in Community Maps hub

  return (
    <PageWrapper>
      <div className="min-h-screen p-6 text-white">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(0,212,255,0.7)]">
              GameDash Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-slate-400">
              Vue competitive complete: MMR par mode, rang, niveau, progression et quetes.
            </p>
          </div>
          <UserMenu user={currentUser} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="dashboard-card rounded-2xl p-6 transition-all duration-200 hover:shadow-2xl hover:shadow-cyan-500/20">
            <h2 className="mb-2 text-xl">Status</h2>
            <p>{status}</p>
            <p className="mt-2 text-sm text-slate-400">Etat joueur: {playerStatus}</p>
          </div>

          <div className="dashboard-card rounded-2xl p-6 transition-all duration-200 hover:shadow-2xl hover:shadow-cyan-500/20">
            <h2 className="mb-2 text-xl">Players Online</h2>
            <p className="text-3xl text-green-400">{players}</p>
          </div>

          <div className="dashboard-card rounded-2xl p-6 transition-all duration-200 hover:shadow-2xl hover:shadow-pink-500/20">
            <h2 className="mb-2 text-xl">Ranked MMR</h2>
            <p className="text-3xl text-pink-400">{elo}</p>
          </div>

          <div className="dashboard-card rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-2xl hover:shadow-yellow-500/20">
            <h2 className="mb-2 text-xl">Rank</h2>
            <p className="text-3xl font-bold text-yellow-300">{rank || "Unranked"}</p>
          </div>

          <div className="dashboard-card rounded-2xl p-6 transition-all duration-200 hover:shadow-2xl hover:shadow-purple-500/20">
            <h2 className="mb-2 text-xl">Level</h2>
            <p className="text-3xl text-purple-300">{summary?.level ?? currentUser?.level ?? 1}</p>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400"
                style={{ width: `${currentXpPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              XP {summary?.xp ?? 0} / {summary?.xp_needed_for_next_level ?? 100}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="dashboard-card rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">MMR by mode</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Competitive Snapshot</h2>
              </div>
              <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
                Winrate: {winrate?.winrate ?? 0}%
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {mmrByMode.map(({ mode, elo }) => (
                <div key={mode} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{mode}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{elo}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Wins</p>
                <p className="mt-2 text-3xl font-bold text-green-300">{summary?.wins ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Losses</p>
                <p className="mt-2 text-3xl font-bold text-red-300">{summary?.losses ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Coins</p>
                <p className="mt-2 text-3xl font-bold text-yellow-300">
                  {summary?.soft_currency ?? currentUser?.soft_currency ?? 0}
                </p>
                <p className="mt-2 text-sm text-cyan-200">
                  Hard {summary?.hard_currency ?? currentUser?.hard_currency ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-card rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-pink-300/70">Rank distribution</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Meta Ladder</h2>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rankDistribution} dataKey="value" nameKey="label" outerRadius={90}>
                    {rankDistribution.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="dashboard-card rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300/70">Objectives</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Quetes quotidiennes & hebdo</h2>
            <div className="mt-5 space-y-4">
              {quests.map((quest) => {
                const progress = Math.min(100, (quest.progress / Math.max(quest.target, 1)) * 100);
                return (
                  <div key={quest.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{quest.label}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          +{quest.reward_xp} XP | +{quest.reward_currency} coins
                        </p>
                      </div>
                      <span className="text-sm text-cyan-200">
                        {quest.progress}/{quest.target}
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className={`h-2 rounded-full ${quest.completed ? "bg-emerald-400" : "bg-cyan-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-card rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Leaderboard</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Top Ranked Players</h2>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboard}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="pseudo" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="elo" radius={[10, 10, 0, 0]} fill="#22d3ee" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={() => window.location.href = "/matchmaking"}
            className="rounded-xl bg-purple-500 px-6 py-3 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/20 active:scale-95"
          >
            Go Matchmaking
          </button>
          <button
            onClick={() => window.location.href = "/history"}
            className="rounded-xl bg-cyan-500 px-6 py-3 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-cyan-500/20 active:scale-95"
          >
            Voir historique
          </button>
          <button
            onClick={() => window.location.href = "/elo"}
            className="rounded-xl bg-pink-500 px-6 py-3 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/20 active:scale-95"
          >
            Voir evolution ELO
          </button>
          <button
            onClick={() => window.location.href = "/store"}
            className="rounded-xl bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-amber-500/20 active:scale-95"
          >
            Boutique
          </button>
          <button
            onClick={() => window.location.href = "/maps"}
            className="rounded-xl bg-purple-600 px-6 py-3 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/20 active:scale-95"
          >
            Community Maps
          </button>
          {/* 'Créer une Map' button removed — publishing moved to Community Maps hub */}
          {currentUser?.role === "admin" && (
            <button
              onClick={() => window.location.href = "/admin"}
              className="rounded-xl bg-red-500 px-6 py-3 transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:shadow-red-500/20 active:scale-95"
            >
              Admin Panel
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
