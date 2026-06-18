import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import { deleteAccount, getMe, updateProfile } from "../services/api";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    pseudo: "",
    avatar_url: "",
    bio: "",
    region: "",
    language: "",
    matchmaking_preferences: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser(data);
        setForm({
          pseudo: data.pseudo || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
          region: data.region || "",
          language: data.language || "",
          matchmaking_preferences: data.matchmaking_preferences || "",
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Impossible de charger le profil.");
      });
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      handleChange("avatar_url", dataUrl);
      toast.success("Avatar charge.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger l'image.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedUser = await updateProfile(user.id, form);
      setUser(updatedUser);
      toast.success("Profil mis a jour.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre a jour le profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer votre compte ? Cette action est irreversible."
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount(user.id);
      localStorage.removeItem("token");
      localStorage.removeItem("match");
      toast.success("Compte supprime.");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer le compte.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageWrapper>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400 drop-shadow-[0_0_20px_rgba(0,212,255,0.7)] sm:text-4xl">
            Mon Profil
          </h1>
          <p className="mt-2 text-slate-400">
            Personnalisez votre compte, vos preferences et votre identite joueur.
          </p>
          <BackToDashboardButton className="mt-4" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <div className="dashboard-card rounded-3xl p-8 text-center">
            {form.avatar_url ? (
              <img
                src={form.avatar_url}
                alt="Avatar"
                className="mx-auto h-32 w-32 rounded-full object-cover ring-4 ring-cyan-400/20 shadow-2xl shadow-cyan-500/20"
              />
            ) : (
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-pink-500 text-3xl font-black text-slate-950 shadow-2xl shadow-cyan-500/20">
                {(form.pseudo || user?.email || "GD").slice(0, 2).toUpperCase()}
              </div>
            )}

            <h2 className="mt-6 text-2xl font-bold text-white">
              {form.pseudo || "Joueur"}
            </h2>
            <p className="mt-2 break-all text-slate-400">{user?.email || "Chargement..."}</p>

            <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:scale-[1.02]">
              Importer un avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Progression</p>
              <p className="mt-3 text-xl text-white">Rang: {user?.rank || "-"}</p>
              <p className="mt-1 text-xl text-pink-300">ELO: {user?.elo ?? "-"}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="dashboard-card rounded-3xl p-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pseudo</p>
                <input
                  value={form.pseudo}
                  onChange={(e) => handleChange("pseudo", e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  required
                />
              </div>

              <div className="rounded-2xl border border-pink-500/20 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Email</p>
                <p className="mt-3 break-all text-xl font-semibold text-white">{user?.email || "-"}</p>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Region</p>
                <input
                  value={form.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  placeholder="Europe, NA, MENA..."
                />
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Langue</p>
                <input
                  value={form.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  placeholder="fr, en..."
                />
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-5 md:col-span-2">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Bio</p>
                <textarea
                  value={form.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  placeholder="Parle de ton style de jeu, de tes objectifs, de ton univers..."
                />
              </div>

              <div className="rounded-2xl border border-pink-500/20 bg-white/5 p-5 md:col-span-2">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                  Preferences Matchmaking
                </p>
                <textarea
                  value={form.matchmaking_preferences}
                  onChange={(e) => handleChange("matchmaking_preferences", e.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  placeholder="Ex: prefere les parties classees, maps rapides, serveurs EU, parties courtes..."
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Sauvegarde..." : "Sauvegarder le profil"}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="rounded-2xl bg-red-500 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Suppression..." : "Supprimer le compte"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageWrapper>
  );
}
