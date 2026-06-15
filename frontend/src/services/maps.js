const API = "http://127.0.0.1:8000";

export const getMaps = async (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/maps?${query.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    throw new Error("Unable to fetch maps");
  }

  return res.json();
};

export const getMyMaps = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/maps/mine`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to fetch my maps");
  }

  return res.json();
};

export const getMapNotifications = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/maps/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to fetch notifications");
  }

  return res.json();
};

export const readAllMapNotifications = async () => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/maps/notifications/read-all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to mark notifications as read");
  }

  return res.json();
};

export const getCreatorStats = async () => {
  const res = await fetch(`${API}/maps/creator-stats`);
  if (!res.ok) {
    throw new Error("Unable to fetch creator stats");
  }
  return res.json();
};

export const createMap = async ({ title, description, status, tags, content_url, screenshot_urls }) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, status, tags, content_url, screenshot_urls }),
  });

  if (!res.ok) {
    throw new Error("Unable to create map");
  }

  return res.json();
};

export const addMapVersion = async (mapId, notes, content_url, screenshot_urls = []) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/version`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ map_id: mapId, notes, content_url, screenshot_urls }),
  });

  if (!res.ok) {
    throw new Error("Unable to add map version");
  }

  return res.json();
};

export const voteMap = async (id, value) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ map_id: id, value }),
  });

  if (!res.ok) {
    throw new Error("Unable to vote on map");
  }

  return res.json();
};

export const toggleFavoriteMap = async (id) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/favorite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ map_id: id }),
  });

  if (!res.ok) {
    throw new Error("Unable to favorite map");
  }

  return res.json();
};

export const commentMap = async (id, content) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ map_id: id, content }),
  });

  if (!res.ok) {
    throw new Error("Unable to comment on map");
  }

  return res.json();
};

export const testMap = async (id, duration_seconds = 300, completion_rate = 1) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ map_id: id, duration_seconds, completion_rate }),
  });

  if (!res.ok) {
    throw new Error("Unable to record map test");
  }

  return res.json();
};

export const deleteMap = async (mapId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/maps/${mapId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Unable to delete map");
  }
  return res.json();
};

export const updateMap = async (mapId, { title, description, status, tags, content_url, screenshot_urls }) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/maps/${mapId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, status, tags, content_url, screenshot_urls }),
  });
  if (!res.ok) {
    throw new Error("Unable to update map");
  }
  return res.json();
};

export const reportMap = async (id, reason) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ map_id: id, reason }),
  });

  if (!res.ok) {
    throw new Error("Unable to report map");
  }

  return res.json();
};

export const deleteMapComment = async (commentId) => {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/maps/comment/${commentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Unable to delete comment");
  }

  return res.json();
};
