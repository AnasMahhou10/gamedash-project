import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import { getMe } from "../services/api";
import { getEloHistory } from "../services/elo";

export default function EloGraph() {
  const [data, setData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState("ranked");
  const [currentModeElo, setCurrentModeElo] = useState(0);

  useEffect(() => {
    getMe().then(setCurrentUser).catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    fetchData();
  }, [mode]);

  const fetchData = async () => {
    const res = await getEloHistory(mode);

    const formatted = (res.history || []).map((item, index) => ({
      name: `Match ${index + 1}`,
      elo: item.elo,
      delta: item.delta,
      rank: item.rank,
    }));

    setCurrentModeElo(res.current_elo ?? 0);
    setData(formatted);
  };

  return (
    <PageWrapper>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl text-cyan-400 drop-shadow-[0_0_20px_rgba(0,212,255,0.7)] sm:text-4xl">
            ELO Progression
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Visualise ton MMR par mode et vois comment chaque match a fait bouger ton rang.
          </p>
          <BackToDashboardButton className="mt-4" />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          >
            <option value="ranked">Classe</option>
            <option value="unranked">Non classe</option>
            <option value="fun">Fun</option>
          </select>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 text-cyan-200">
            MMR actuel: {currentModeElo}
          </div>
        </div>

        <div className="dashboard-card rounded-xl p-6 transition-all duration-200 hover:shadow-2xl hover:shadow-cyan-500/20">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <XAxis dataKey="name" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Line type="monotone" dataKey="elo" stroke="#00D4FF" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageWrapper>
  );
}
