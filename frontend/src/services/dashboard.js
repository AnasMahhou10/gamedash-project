const API = "http://127.0.0.1:8000";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDashboardSummary = async () => {
  const res = await fetch(`${API}/dashboard/me/summary`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Unable to fetch dashboard summary");
  }

  return res.json();
};

export const getLeaderboard = async (mode = "ranked") => {
  const res = await fetch(`${API}/dashboard/leaderboard?mode=${mode}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Unable to fetch leaderboard");
  }

  return res.json();
};

export const getRankDistribution = async () => {
  const res = await fetch(`${API}/dashboard/rank-distribution`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Unable to fetch rank distribution");
  }

  return res.json();
};

export const getPlayerWinrate = async (userId, mode = "") => {
  const res = await fetch(
    `${API}/dashboard/winrate/${userId}${mode ? `?mode=${mode}` : ""}`,
    {
      headers: authHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Unable to fetch winrate");
  }

  return res.json();
};

export const getMyQuests = async () => {
  const res = await fetch(`${API}/dashboard/quests/me`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Unable to fetch quests");
  }

  return res.json();
};
