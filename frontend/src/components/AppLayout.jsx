import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMe } from "../services/api";
import MobileNav from "./MobileNav";
import UserMenu from "./UserMenu";

export default function AppLayout({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getMe()
      .then((data) => {
        if (isMounted) {
          setCurrentUser(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-layout min-h-screen text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="text-lg font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,212,255,0.35)] sm:text-xl"
          >
            GameDash
          </Link>
          <UserMenu user={currentUser} />
        </div>
      </header>

      <main className="app-layout-main mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
