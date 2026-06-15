const API = "http://127.0.0.1:8000";

export const joinQueue = async (mode) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/matchmaking/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode }),
  });

  if (!res.ok) {
    throw new Error("Unable to join queue");
  }

  return res.json();
};

export const leaveQueue = async () => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/matchmaking/leave`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to leave queue");
  }

  return res.json();
};

export const createMatch = async (mode) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/matchmaking/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mode }),
  });

  if (!res.ok) {
    throw new Error("Unable to create match");
  }

  return res.json();
};

export const getMatchmakingSettings = async () => {
  const token = localStorage.getItem("token");

  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`${API}/matchmaking/settings`, { headers });

  if (!res.ok) {
    throw new Error("Unable to fetch matchmaking settings");
  }

  return res.json();
};

export const getMatchmakingOverview = async () => {
  const token = localStorage.getItem("token");

  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`${API}/matchmaking/queue-overview`, { headers });

  if (!res.ok) {
    throw new Error("Unable to fetch matchmaking overview");
  }

  return res.json();
};

export const getCurrentMatch = async () => {
  const token = localStorage.getItem("token");

  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : undefined;

  const res = await fetch(`${API}/matchmaking/current`, { headers });

  if (!res.ok) {
    throw new Error("Unable to fetch current match");
  }

  return res.json();
};
