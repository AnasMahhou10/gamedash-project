import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMapNotifications } from "../services/maps";

export default function UserMenu({ user }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = useMemo(() => {
    const source = user?.pseudo || user?.email || "GD";
    return source.slice(0, 2).toUpperCase();
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUnreadCount(0);
      return;
    }

    getMapNotifications()
      .then((data) => setUnreadCount(data.unread_count || 0))
      .catch(() => setUnreadCount(0));
  }, [user?.id]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("match");
    navigate("/");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-slate-900/80"
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt="Avatar"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-cyan-400/30"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-pink-400 font-black text-slate-950 shadow-lg shadow-cyan-500/10">
            {initials}
          </div>
        )}
        <div className="hidden text-left sm:block">
          <p className="max-w-40 truncate text-sm font-semibold text-white">
            {user?.pseudo || "Profil"}
          </p>
          <p className="max-w-40 truncate text-xs text-slate-400">
            {user?.email || "Compte"}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-pink-500 px-2 text-xs font-bold text-white">
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-cyan-500/20 bg-slate-950/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate("/profile");
            }}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
          >
            Voir profil
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate("/store");
            }}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
          >
            Boutique & inventaire
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate("/my-maps");
            }}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
          >
            <span>Mes maps</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-pink-500 px-2 py-1 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-red-300 transition hover:bg-red-500/10"
          >
            Se deconnecter
          </button>
        </div>
      )}
    </div>
  );
}
