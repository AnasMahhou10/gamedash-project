import { useEffect, useState } from "react";
import { API_URL, logError } from "../config";
import { register } from "../services/api";

export default function Register() {
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => {
        const nextParticles = [...prev];

        for (let i = 0; i < 5; i += 1) {
          nextParticles.push({
            id: Date.now() + i,
            x: Math.random() * 100,
            size: Math.random() * 6 + 2,
            duration: Math.random() * 5 + 6,
            delay: 0,
          });
        }

        return nextParticles.filter((particle) => Date.now() - particle.id < 11000);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      await register({ pseudo, email, password });
      alert("Compte cree avec succes. Vous pouvez maintenant vous connecter.");
      window.location.href = "/";
    } catch (err) {
      logError("Register", err, { apiUrl: API_URL, email });
      alert(
        "Erreur inscription: " +
          (err.response?.data?.detail || err.message || "Impossible de creer le compte")
      );
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 grid-bg z-0" />

      <div className="fixed inset-0 particles-container z-10 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle absolute bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 rounded-full shadow-lg"
            style={{
              left: `${particle.x}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: `float ${particle.duration}s linear infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-20 flex min-h-screen items-center justify-center p-6">
        <div className="login-card w-full max-w-md border border-pink-500/30 bg-white/5 shadow-2xl">
          <div className="scanner" />

          <div className="logo mb-10 text-center">
            <h1 className="mb-3 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 bg-clip-text text-5xl font-black text-transparent drop-shadow-2xl md:text-6xl animate-glow">
              GAME DASH
            </h1>
            <p className="text-lg font-light tracking-wider text-pink-200/80">
              Creez votre profil de challenger
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="relative">
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-cyan-500/30 bg-white/5 p-4 text-lg text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:scale-[1.02] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20"
                placeholder="Pseudo"
              />
            </div>

            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-cyan-500/30 bg-white/5 p-4 text-lg text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:scale-[1.02] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20"
                placeholder="Email"
              />
            </div>

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-pink-500/30 bg-white/5 p-4 text-lg text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:scale-[1.02] focus:border-pink-400 focus:ring-4 focus:ring-pink-500/20"
                placeholder="Mot de passe"
              />
            </div>

            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-yellow-500/30 bg-white/5 p-4 text-lg text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:scale-[1.02] focus:border-yellow-400 focus:ring-4 focus:ring-yellow-500/20"
                placeholder="Confirmer le mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-400 px-6 py-4 text-lg font-black uppercase tracking-wider text-slate-950 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl hover:shadow-pink-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? "CREATION DU COMPTE..." : "CREER MON COMPTE"}
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6 text-center">
            <span className="text-sm text-white/60">Deja un compte ? </span>
            <a
              href="/"
              className="font-semibold text-cyan-400 transition-all duration-200 hover:text-cyan-300 hover:underline"
            >
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
