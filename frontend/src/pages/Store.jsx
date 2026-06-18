import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import BackToDashboardButton from "../components/BackToDashboardButton";
import PageWrapper from "../components/PageWrapper";
import { getMe } from "../services/api";
import {
  checkoutPack,
  claimSeasonPassTier,
  equipInventoryItem,
  getShopOverview,
  purchaseSeasonPass,
  purchaseShopItem,
} from "../services/shop";

const rarityClasses = {
  rare: "border-cyan-400/30",
  epic: "border-fuchsia-400/30",
  legendary: "border-amber-400/30",
};

export default function Store() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [me, shopOverview] = await Promise.all([getMe(), getShopOverview()]);
        setCurrentUser(me);
        setOverview(shopOverview);
      } catch (error) {
        console.error(error);
        toast.error("Impossible de charger la boutique.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const refreshWith = async (promise, successMessage) => {
    try {
      const data = await promise;
      setOverview(data);
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              soft_currency: data.balances.soft_currency,
              hard_currency: data.balances.hard_currency,
              equipped_avatar_frame: data.equipped.avatar_frame,
              equipped_title: data.equipped.title,
            }
          : prev
      );
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Operation impossible.");
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-24 text-white">
          Chargement de la boutique...
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-300 drop-shadow-[0_0_22px_rgba(252,211,77,0.35)] sm:text-4xl">
            Boutique & Economie
          </h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Boutique live, inventaire equipe, packs monetises, pass de saison et journal de transactions.
          </p>
          <BackToDashboardButton className="mt-4" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.3),rgba(2,6,23,0.92))] p-6 shadow-2xl shadow-amber-500/10">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/70">Wallet</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Soft currency</p>
                <p className="mt-2 text-4xl font-black text-yellow-200">{overview?.balances?.soft_currency ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Hard currency</p>
                <p className="mt-2 text-4xl font-black text-cyan-200">{overview?.balances?.hard_currency ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Equipement</p>
                <p className="mt-2 text-sm text-white">
                  Frame: {overview?.equipped?.avatar_frame || "Aucun"}
                </p>
                <p className="mt-1 text-sm text-white">
                  Titre: {overview?.equipped?.title || "Aucun"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),rgba(2,6,23,0.96))] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Season Pass</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{overview?.season_pass?.season_name}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Tier actuel: {overview?.season_pass?.current_tier ?? 0} | Prix premium:{" "}
                  {overview?.economy_settings?.premium_pass_price_hard ?? 0} hard
                </p>
              </div>
              <button
                disabled={overview?.season_pass?.premium_unlocked || busyKey === "pass"}
                onClick={async () => {
                  setBusyKey("pass");
                  await refreshWith(purchaseSeasonPass(), "Pass premium active.");
                  setBusyKey("");
                }}
                className="rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {overview?.season_pass?.premium_unlocked ? "Premium actif" : "Debloquer le premium"}
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {(overview?.season_pass?.tiers || []).map((tier) => (
                <div key={tier.tier} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">Tier {tier.tier}</p>
                      <p className="text-sm text-slate-400">
                        Free: {tier.free_reward.type === "item" ? tier.free_reward.sku : `${tier.free_reward.amount} ${tier.free_reward.type}`}
                      </p>
                      <p className="text-sm text-slate-400">
                        Premium: {tier.premium_reward.type === "item" ? tier.premium_reward.sku : `${tier.premium_reward.amount} ${tier.premium_reward.type}`}
                      </p>
                    </div>
                    <button
                      disabled={!tier.unlocked || (tier.free_claimed && (!overview?.season_pass?.premium_unlocked || tier.premium_claimed)) || busyKey === `tier-${tier.tier}`}
                      onClick={async () => {
                        setBusyKey(`tier-${tier.tier}`);
                        await refreshWith(claimSeasonPassTier(tier.tier), `Tier ${tier.tier} recupere.`);
                        setBusyKey("");
                      }}
                      className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tier.free_claimed && (!overview?.season_pass?.premium_unlocked || tier.premium_claimed)
                        ? "Deja recupere"
                        : tier.unlocked
                          ? "Recuperer"
                          : `${tier.xp_required} XP requis`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-pink-200/70">Boutique</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {(overview?.catalog || []).map((item) => (
                <div
                  key={item.sku}
                  className={`rounded-2xl border bg-white/5 p-5 ${rarityClasses[item.rarity] || "border-white/10"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-500">
                        {item.item_type} | {item.rarity}
                      </p>
                    </div>
                    {item.is_featured && (
                      <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <p className="text-sm text-slate-300">
                      {item.price_hard > 0 ? `${item.price_hard} hard` : `${item.price_soft} soft`}
                    </p>
                    <button
                      disabled={item.owned || busyKey === item.sku}
                      onClick={async () => {
                        setBusyKey(item.sku);
                        await refreshWith(purchaseShopItem(item.sku), `${item.name} ajoute a l'inventaire.`);
                        setBusyKey("");
                      }}
                      className="rounded-xl bg-amber-300 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {item.owned ? "Possede" : "Acheter"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Packs</p>
            <div className="mt-5 space-y-4">
              {(overview?.packs || []).map((pack) => (
                <div key={pack.sku} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-white">{pack.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{pack.description}</p>
                      <p className="mt-3 text-sm text-slate-300">
                        +{pack.total_soft_currency} soft | +{pack.total_hard_currency} hard
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                      {(pack.price_cents / 100).toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {overview?.economy_settings?.stripe_enabled && (
                      <button
                        disabled={busyKey === `${pack.sku}-stripe`}
                        onClick={async () => {
                          setBusyKey(`${pack.sku}-stripe`);
                          try {
                            const data = await checkoutPack(pack.sku, "stripe");
                            navigate(data.checkout_url);
                          } catch (error) {
                            console.error(error);
                            toast.error(error.message || "Operation impossible.");
                          } finally {
                            setBusyKey("");
                          }
                        }}
                        className="rounded-xl bg-violet-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
                      >
                        Stripe simule
                      </button>
                    )}
                    {overview?.economy_settings?.paypal_enabled && (
                      <button
                        disabled={busyKey === `${pack.sku}-paypal`}
                        onClick={async () => {
                          setBusyKey(`${pack.sku}-paypal`);
                          try {
                            const data = await checkoutPack(pack.sku, "paypal");
                            navigate(data.checkout_url);
                          } catch (error) {
                            console.error(error);
                            toast.error(error.message || "Operation impossible.");
                          } finally {
                            setBusyKey("");
                          }
                        }}
                        className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
                      >
                        PayPal simule
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Inventaire</p>
            <div className="mt-5 space-y-4">
              {(overview?.inventory || []).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{entry.item?.name || entry.item_sku}</p>
                      <p className="text-sm text-slate-400">
                        {entry.item_type} | obtenu via {entry.source_type}
                      </p>
                    </div>
                    <button
                      disabled={entry.equipped || busyKey === `equip-${entry.id}`}
                      onClick={async () => {
                        setBusyKey(`equip-${entry.id}`);
                        await refreshWith(equipInventoryItem(entry.id), "Objet equipe.");
                        setBusyKey("");
                      }}
                      className="rounded-xl border border-cyan-400/30 px-4 py-2 text-cyan-100 disabled:opacity-50"
                    >
                      {entry.equipped ? "Equipe" : "Equiper"}
                    </button>
                  </div>
                </div>
              ))}
              {(overview?.inventory || []).length === 0 && (
                <p className="text-sm text-slate-500">Aucun objet dans l'inventaire.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200/70">Transactions</p>
            <div className="mt-5 space-y-3">
              {(overview?.transactions || []).slice(0, 12).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">
                      {entry.kind === "payment" ? `${entry.provider?.toUpperCase()} ${entry.pack_sku}` : `${entry.currency_type} ${entry.amount > 0 ? "+" : ""}${entry.amount}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : "-"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {entry.kind === "payment"
                      ? `Paiement simule ${entry.status} | ref ${entry.external_ref}`
                      : entry.source}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
