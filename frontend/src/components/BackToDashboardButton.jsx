export default function BackToDashboardButton({ className = "" }) {
  return (
    <button
      onClick={() => {
        window.location.href = "/dashboard";
      }}
      className={`rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/10 active:translate-y-0 ${className}`.trim()}
    >
      Retour Dashboard
    </button>
  );
}
