import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Accueil",
    match: ["/dashboard", "/history", "/elo"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/matchmaking",
    label: "Jouer",
    match: ["/matchmaking"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="m14.5 5.5 4 4M7 18l8.5-8.5 3 3L10 21H7v-3Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/maps",
    label: "Maps",
    match: ["/maps", "/my-maps"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 4v14M15 6v14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/store",
    label: "Boutique",
    match: ["/store", "/checkout"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path d="M6 8h12l-1 12H7L6 8Z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Profil",
    match: ["/profile"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function isActive(pathname, matchPaths) {
  return matchPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="mobile-nav fixed inset-x-0 bottom-0 z-50 border-t border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mobile-nav-inner mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActive(location.pathname, item.match);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`mobile-nav-item flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wide transition-colors ${
                active ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                  active
                    ? "bg-cyan-500/15 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.2)]"
                    : "text-slate-400"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
