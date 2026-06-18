import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import { getMe } from "../services/api";
import {
  commentMap,
  deleteMapComment,
  getMapNotifications,
  getMyMaps,
  readAllMapNotifications,
} from "../services/maps";

export default function MyMaps() {
  const [currentUser, setCurrentUser] = useState(null);
  const [maps, setMaps] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState({});

  const load = async () => {
    try {
      const [me, myMaps, notificationPayload] = await Promise.all([
        getMe(),
        getMyMaps(),
        getMapNotifications(),
      ]);
      setCurrentUser(me);
      setMaps(myMaps);
      setNotifications(notificationPayload.items || []);
      setUnreadCount(notificationPayload.unread_count || 0);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger l'espace createur.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReply = async (mapId) => {
    try {
      await commentMap(mapId, replyDrafts[mapId] || "");
      toast.success("Reponse ajoutee.");
      setReplyDrafts((prev) => ({ ...prev, [mapId]: "" }));
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'ajouter la reponse.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteMapComment(commentId);
      toast.success("Commentaire supprime.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer le commentaire.");
    }
  };

  const handleReadAll = async () => {
    try {
      await readAllMapNotifications();
      toast.success("Notifications marquees comme lues.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre a jour les notifications.");
    }
  };

  return (
    <PageWrapper>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl text-cyan-400 drop-shadow-[0_0_20px_rgba(0,212,255,0.7)] sm:text-4xl">
            My Maps Studio
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Gerez vos maps, surveillez l'activite communautaire et repondez aux commentaires.
          </p>
          <BackToDashboardButton className="mt-4" />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="dashboard-card rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-pink-300/70">Notifications</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Activite recente</h2>
              </div>
              <button
                onClick={handleReadAll}
                className="rounded-2xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:scale-[1.02]"
              >
                Tout lire ({unreadCount})
              </button>
            </div>

            <div className="space-y-3">
              {notifications.slice(0, 8).map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${
                    notification.is_read
                      ? "border-white/10 bg-white/5"
                      : "border-cyan-400/30 bg-cyan-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{notification.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{notification.message}</p>
                </div>
              ))}

              {notifications.length === 0 && (
                <p className="text-sm text-slate-500">Aucune notification pour le moment.</p>
              )}
            </div>
          </div>

          <div className="dashboard-card rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Overview</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Mes maps publiees</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Maps</p>
                <p className="mt-2 text-3xl font-bold text-white">{maps.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Commentaires</p>
                <p className="mt-2 text-3xl font-bold text-pink-300">
                  {maps.reduce((sum, map) => sum + (map.comments_count || 0), 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Tests</p>
                <p className="mt-2 text-3xl font-bold text-cyan-300">
                  {maps.reduce((sum, map) => sum + (map.tests_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {maps.map((map) => (
            <div key={map.id} className="dashboard-card rounded-3xl p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{map.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {map.status} | commentaires {map.comments_count} | tests {map.tests_count}
                  </p>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200">
                  Popularite {map.popularity}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">
                    Commentaires
                  </p>
                  <div className="space-y-3">
                    {map.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-pink-300">{comment.author_name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200 transition hover:scale-[1.02]"
                          >
                            Supprimer
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{comment.content}</p>
                      </div>
                    ))}

                    {map.comments.length === 0 && (
                      <p className="text-sm text-slate-500">Aucun commentaire sur cette map.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="mb-3 text-sm uppercase tracking-[0.25em] text-slate-400">
                    Repondre et gerer
                  </p>
                  <textarea
                    value={replyDrafts[map.id] || ""}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [map.id]: e.target.value }))
                    }
                    rows={5}
                    placeholder="Repondre aux retours de la communaute..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none"
                  />
                  <button
                    onClick={() => handleReply(map.id)}
                    className="mt-3 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]"
                  >
                    Publier une reponse
                  </button>
                </div>
              </div>
            </div>
          ))}

          {maps.length === 0 && (
            <p className="text-center text-slate-500">Vous n'avez pas encore publie de map.</p>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
