"use client";

import { useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useAccount, useConnect, useWalletClient } from "wagmi";
import { formatEther } from "viem";
import { Loader2 } from "lucide-react";
import { useMinerData, usePriceTicker, useGlaze } from "@/features/terminal";
import { MINER_QUOTE_POLLING_INTERVAL_MS } from "@/config/miner-constants";
import { formatEth, formatDonut } from "@/lib/miner/format";
import { truncateAddress, timeAgo } from "@/lib/format";
import { getPreferredWalletConnectors, shouldTryNextConnector } from "@/lib/farcaster-wallet";
import type { FarcasterProfile, FeedItem } from "@/types/miner";

// ─── helpers ────────────────────────────────────────────────────────────────
function formatGraphEth(value: string): string {
  try {
    const num = parseFloat(value);
    if (num === 0) return "0.0000";
    return num.toFixed(4);
  } catch {
    return "0.0000";
  }
}

function formatGraphDonut(value: string): string {
  try {
    const num = parseFloat(value);
    if (num === 0) return "0";
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } catch {
    return "0";
  }
}

function formatUsd(ethAmount: string | number, ethPrice: number): string {
  const val = typeof ethAmount === "string" ? parseFloat(ethAmount) : ethAmount;
  const usd = val * ethPrice;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div
        className={`font-bold text-[17px] tabular-nums font-mono ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ProfileAvatar({
  profile,
  size = 40,
}: {
  profile: FarcasterProfile | null;
  size?: number;
}) {
  if (!profile?.pfp) {
    return (
      <div
        className="rounded-full bg-[hsl(var(--foreground)/0.1)] flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Image
          src="/media/logo-transparent.png"
          alt="DONUT"
          width={size * 0.6}
          height={size * 0.6}
        />
      </div>
    );
  }
  return (
    <Image
      src={profile.pfp}
      alt={profile.displayName || profile.username}
      width={size}
      height={size}
      className="rounded-full object-cover"
    />
  );
}

function DonutMark({ size = 12 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border-solid border-primary"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderWidth: `${Math.round(size * 0.29 * 10) / 10}px`,
      }}
    />
  );
}

// ─── main page ──────────────────────────────────────────────────────────────

export default function MinePage() {
  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { data: walletClient } = useWalletClient();

  const {
    minerState,
    setMinerState,
    kingProfile,
    feed,
    feedProfiles,
    stats,
    userGraphStats,
    ethPrice,
    nextHalvingTime,
  } = useMinerData(address, {
    statePollingIntervalMs: MINER_QUOTE_POLLING_INTERVAL_MS,
  });

  const { now, halvingDisplay } = usePriceTicker(nextHalvingTime);
  const quotePrice = minerState.price ?? 0n;

  const syncMinerState = useCallback(
    (newState: typeof minerState) => setMinerState(newState),
    [setMinerState]
  );

  const { isGlazing, connectionError, message, setMessage, handleGlaze } =
    useGlaze(address, walletClient, minerState, syncMinerState);

  // Derived values
  const donutPerSecond = useMemo(() => {
    try {
      const dps = parseFloat(formatEther(minerState.dps));
      return dps.toFixed(2);
    } catch {
      return "0.00";
    }
  }, [minerState.dps]);

  const glazedEth = useMemo(() => formatEth(minerState.glazed), [minerState.glazed]);
  const priceDisplay = useMemo(() => formatEth(quotePrice), [quotePrice]);
  const totalMined = useMemo(() => formatGraphDonut(stats.minted), [stats.minted]);
  const totalRevenue = useMemo(() => formatGraphEth(stats.revenue), [stats.revenue]);

  const minerElapsed = useMemo(() => {
    if (!minerState.startTime || !now) return "--";
    const secs = Math.floor(now / 1000) - minerState.startTime;
    if (secs < 0) return "--";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [minerState.startTime, now]);

  // Accrued donuts (elapsed × dps)
  const WEI = 1000000000000000000n;
  const safeDps = minerState.dps ?? 0n;
  const safeDonutPrice = minerState.donutPrice ?? 0n;
  const safeInitPrice = minerState.initPrice ?? 0n;
  const elapsedSecs = useMemo(() => {
    if (!minerState.startTime || !now) return 0n;
    return BigInt(Math.max(0, Math.floor(now / 1000) - minerState.startTime));
  }, [minerState.startTime, now]);

  const accruedDonutsWei = elapsedSecs * safeDps;
  const accruedDonutsStr = formatDonut(accruedDonutsWei);
  const accruedValueWei = WEI > 0n ? (accruedDonutsWei * safeDonutPrice) / WEI : 0n;
  const accruedValueUsd = (parseFloat(formatEther(accruedValueWei)) * ethPrice).toFixed(2);

  // PNL
  const halfInitPrice = safeInitPrice / 2n;
  const pnlWei = (quotePrice * 80n) / 100n - halfInitPrice;
  const pnlIsPositive = pnlWei >= 0n;
  const pnlAbsWei = pnlIsPositive ? pnlWei : -pnlWei;
  const pnlEthNum = parseFloat(formatEther(pnlAbsWei));
  const pnlSign = pnlIsPositive ? "+" : "-";
  const pnlEthStr = `${pnlSign}Ξ${pnlEthNum.toFixed(5)}`;
  const pnlUsdNum = pnlEthNum * ethPrice;
  const pnlUsdStr = `${pnlSign}$${pnlUsdNum.toFixed(2)}`;

  // Total
  const accruedUsdNum = parseFloat(accruedValueUsd);
  const pnlUsdSigned = pnlIsPositive ? pnlUsdNum : -pnlUsdNum;
  const totalUsdNum = accruedUsdNum + pnlUsdSigned;
  const totalIsPositive = totalUsdNum >= 0;
  const totalUsdStr = `${totalIsPositive ? "+" : "-"}$${Math.abs(totalUsdNum).toFixed(2)}`;

  const handleConnect = async () => {
    let lastError: unknown;

    for (const connector of getPreferredWalletConnectors(connectors)) {
      try {
        await connectAsync({ connector });
        return;
      } catch (e) {
        lastError = e;
        if (!shouldTryNextConnector(connector, e)) break;
      }
    }

    if (lastError) {
      console.error("Connect failed:", lastError);
    }
  };

  // ─── render ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background">
      <div
        className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 76px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div className="lg:pt-[88px]">
          {/* ── page header (desktop only) ────────────────────────── */}
          <div className="hidden lg:block mb-6">
            <h1 className="font-display text-[2.75rem] font-semibold leading-[0.9] tracking-[-0.04em]">Mine</h1>
            <p className="page-subtitle">
              Glaze the world. Mine DONUT, earn ETH, and climb the leaderboard.
            </p>
          </div>

        {/* ── MOBILE LAYOUT ─────────────────────────────────────── */}
        <div className="lg:hidden space-y-4">
          {/* 1. Current Miner */}
          <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Current Miner</div>
                <p className="text-[12px] text-muted-foreground mt-0.5">The active glazer earning DONUT rewards.</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-medium tabular-nums font-mono">{minerElapsed}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative shrink-0">
                <ProfileAvatar profile={kingProfile} size={36} />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[hsl(var(--background))]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{kingProfile?.displayName || truncateAddress(minerState.miner)}</div>
                <div className="text-xs text-muted-foreground truncate">@{kingProfile?.username || "unknown"}</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-start">
                <span className="text-xs text-muted-foreground">Mined</span>
                <div className="text-right">
                  <div className="text-sm font-medium inline-flex items-center justify-end gap-1 leading-none">
                    <span>+</span><DonutMark size={12} /><span>{accruedDonutsStr}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">+${accruedValueUsd}</div>
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-muted-foreground">PNL</span>
                <div className="text-right">
                  <div className="text-sm font-medium tabular-nums font-mono">{pnlEthStr}</div>
                  <div className="text-[11px] text-muted-foreground">{pnlUsdStr}</div>
                </div>
              </div>
              <div className="border-t border-[hsl(var(--foreground)/0.1)] my-2" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Total</span>
                <span className={`text-sm font-semibold tabular-nums font-mono ${totalIsPositive ? "text-emerald-400" : "text-red-400"}`}>{totalUsdStr}</span>
              </div>
            </div>
          </div>

          {/* 2. Mine */}
          <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
            <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Mine</div>
            <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Send a message and mine DONUT.</p>
            <input type="text" className="field-input w-full mb-4" maxLength={200} placeholder="Enter a message to glaze..." value={message} onChange={(e) => setMessage(e.target.value)} disabled={isGlazing || !isConnected} spellCheck={false} />
            <div className="flex items-stretch gap-4">
              <div className="flex items-center gap-8 shrink-0">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Rate</div>
                  <div className="text-lg font-semibold flex items-center gap-1.5">
                    <DonutMark size={14} />
                    <span className="font-mono tabular-nums">{donutPerSecond}/s</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground mb-0.5">Price</div>
                  <div className="text-lg font-semibold text-primary tabular-nums font-mono">Ξ{priceDisplay}</div>
                </div>
              </div>
              {isConnected ? (
                <button className="slab-button flex-1 text-sm font-semibold" onClick={handleGlaze} disabled={isGlazing || quotePrice === 0n}>
                  {isGlazing ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />...</span> : "Mine"}
                </button>
              ) : (
                <button className="slab-button flex-1 text-sm font-semibold" onClick={handleConnect}>Connect Wallet</button>
              )}
            </div>
            {connectionError && (
              <div className="mt-3 p-3 rounded-[var(--radius)] bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)]">
                <p className="text-[12px] text-[hsl(var(--destructive))]">{connectionError}</p>
              </div>
            )}
          </div>

          {/* 3. Your Position */}
          {isConnected && (
            <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
              <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Your Position</div>
              <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Your wallet balances and mining stats.</p>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">DONUT</span>
                  <span className="text-sm font-medium inline-flex items-center gap-1">
                    <DonutMark size={12} />
                    {formatDonut(minerState.donutBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">ETH</span>
                  <span className="text-sm font-medium tabular-nums font-mono">Ξ{formatEth(minerState.ethBalance)}</span>
                </div>
                <div className="border-t border-[hsl(var(--foreground)/0.1)] my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">ETH Spent</span>
                  <span className="text-sm font-medium tabular-nums font-mono">Ξ{userGraphStats ? formatGraphEth(userGraphStats.spent) : "0.0000"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">ETH Earned</span>
                  <span className="text-sm font-medium tabular-nums font-mono">Ξ{userGraphStats ? formatGraphEth(userGraphStats.earned) : "0.0000"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">DONUT Mined</span>
                  <span className="text-sm font-medium inline-flex items-center gap-1">
                    <DonutMark size={12} />
                    {userGraphStats ? formatGraphDonut(userGraphStats.mined) : "0"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Network Stats */}
          <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
            <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Network Stats</div>
            <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Protocol-wide mining metrics.</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Mined</span>
                <span className="text-sm font-medium inline-flex items-center gap-1">
                  <DonutMark size={12} />
                  {totalMined}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Price</span>
                <span className="text-sm font-medium tabular-nums font-mono">
                  {ethPrice > 0 && minerState.donutPrice ? `$${(parseFloat(formatEther(minerState.donutPrice)) * ethPrice).toFixed(6)}` : "--"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Next Halving</span>
                <span className="text-sm font-medium tabular-nums font-mono">{halvingDisplay}</span>
              </div>
            </div>
          </div>

          {/* 5. Recent Activity */}
          <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
            <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Recent Activity</div>
            <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Latest 10 glaze transactions.</p>
            <div className="space-y-2">
              {feed.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-[13px]">No recent activity</div>
              ) : (
                feed.slice(0, 10).map((item, idx) => {
                  const profile = feedProfiles[item.miner.toLowerCase()];
                  const isLive = idx === 0;
                  return (
                    <div key={item.id} className={`flex items-center gap-3 py-2.5 ${isLive ? "bg-[hsl(var(--primary)/0.05)] rounded-[var(--radius)] px-2 -mx-2" : ""}`}>
                      <ProfileAvatar profile={profile || null} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{profile?.username || truncateAddress(item.miner)}</span>
                          {isLive && <span className="text-[9px] font-semibold text-primary bg-[hsl(var(--primary)/0.2)] px-1.5 py-0.5 rounded">Live</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{item.uri || "—"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] text-muted-foreground">Spent</div>
                        <div className="text-[13px] font-medium font-mono tabular-nums">Ξ{(() => { try { return parseFloat(item.price).toFixed(3); } catch { return "0.000"; } })()}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] text-muted-foreground">Mined</div>
                        <div className="text-[13px] font-medium font-mono tabular-nums inline-flex items-center gap-1">
                          <DonutMark size={8} />
                          {isLive ? accruedDonutsStr : (item.mined ? parseFloat(item.mined).toLocaleString() : "0")}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── DESKTOP LAYOUT ──────────────────────────────────────── */}
        <div className="hidden lg:flex lg:gap-6">
          {/* ── LEFT COLUMN ──────────────────────────────────────── */}
          <div className="lg:w-[380px] lg:shrink-0 space-y-6">
            {/* Current Miner card */}
            <div className="slab-panel rounded-[var(--radius)] mb-6 px-3 py-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Current Miner</div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">The active glazer earning DONUT rewards.</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium tabular-nums font-mono">{minerElapsed}</div>
                </div>
              </div>

              {/* Profile */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative shrink-0">
                  <ProfileAvatar profile={kingProfile} size={36} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[hsl(var(--background))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {kingProfile?.displayName || truncateAddress(minerState.miner)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{kingProfile?.username || "unknown"}
                  </div>
                </div>
              </div>

              {/* Stats rows */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">Mined</span>
                  <div className="text-right">
                    <div className="text-sm font-medium inline-flex items-center justify-end gap-1 leading-none">
                      <span>+</span><DonutMark size={12} /><span>{accruedDonutsStr}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">+${accruedValueUsd}</div>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground">PNL</span>
                  <div className="text-right">
                    <div className="text-sm font-medium tabular-nums font-mono">{pnlEthStr}</div>
                    <div className="text-[11px] text-muted-foreground">{pnlUsdStr}</div>
                  </div>
                </div>

                <div className="border-t border-[hsl(var(--foreground)/0.1)] my-2" />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium">Total</span>
                  <span className={`text-sm font-semibold tabular-nums font-mono ${totalIsPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {totalUsdStr}
                  </span>
                </div>
              </div>
            </div>

            {/* Network Stats card */}
            <div className="slab-panel rounded-[var(--radius)] mb-6 px-3 py-4">
              <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Network Stats</div>
              <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Protocol-wide mining metrics.</p>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Mined</span>
                  <span className="text-sm font-medium inline-flex items-center gap-1">
                    <DonutMark size={12} />
                    {totalMined}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Price</span>
                  <span className="text-sm font-medium tabular-nums font-mono">
                    {ethPrice > 0 && minerState.donutPrice
                      ? `$${(parseFloat(formatEther(minerState.donutPrice)) * ethPrice).toFixed(6)}`
                      : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Next Halving</span>
                  <span className="text-sm font-medium tabular-nums font-mono">{halvingDisplay}</span>
                </div>
              </div>
            </div>

            {/* Your Position card (only when connected) */}
            {isConnected && (
              <div className="slab-panel rounded-[var(--radius)] mb-6 px-3 py-4">
                <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Your Position</div>
                <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Your wallet balances and mining stats.</p>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">DONUT</span>
                    <span className="text-sm font-medium inline-flex items-center gap-1">
                      <DonutMark size={12} />
                      {formatDonut(minerState.donutBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">ETH</span>
                    <span className="text-sm font-medium tabular-nums font-mono">Ξ{formatEth(minerState.ethBalance)}</span>
                  </div>

                  <div className="border-t border-[hsl(var(--foreground)/0.1)] my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">ETH Spent</span>
                    <span className="text-sm font-medium tabular-nums font-mono">Ξ{userGraphStats ? formatGraphEth(userGraphStats.spent) : "0.0000"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">ETH Earned</span>
                    <span className="text-sm font-medium tabular-nums font-mono">Ξ{userGraphStats ? formatGraphEth(userGraphStats.earned) : "0.0000"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">DONUT Mined</span>
                    <span className="text-sm font-medium inline-flex items-center gap-1">
                      <DonutMark size={12} />
                      {userGraphStats ? formatGraphDonut(userGraphStats.mined) : "0"}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN (sticky sidebar — matches fundraiser) ── */}
          <div className="hidden lg:block flex-1 min-w-0 space-y-6">
            <div className="slab-panel rounded-[var(--radius)] mb-6 px-3 py-4">
              <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Mine</div>
              <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Send a message and mine DONUT.</p>

              {/* Message input — single line */}
              <input
                type="text"
                className="field-input w-full mb-4"
                maxLength={200}
                placeholder="Enter a message to glaze..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isGlazing || !isConnected}
                spellCheck={false}
              />

              {/* Stats + Glaze button — horizontal layout */}
              <div className="flex items-stretch gap-4">
                <div className="flex items-center gap-8 shrink-0">
                  {/* Rate */}
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Rate</div>
                    <div className="text-lg font-semibold flex items-center gap-1.5">
                      <DonutMark size={14} />
                      <span className="font-mono tabular-nums">{donutPerSecond}/s</span>
                    </div>
                    {ethPrice > 0 && (
                      <div className="text-xs text-muted-foreground font-mono tabular-nums">
                        ${(parseFloat(donutPerSecond) * parseFloat(formatEther(minerState.donutPrice ?? 0n)) * ethPrice).toFixed(4)}/s
                      </div>
                    )}
                  </div>
                  {/* Price */}
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-0.5">Price</div>
                    <div className="text-lg font-semibold text-primary tabular-nums font-mono">Ξ{priceDisplay}</div>
                    {ethPrice > 0 && (
                      <div className="text-xs text-muted-foreground font-mono tabular-nums">
                        ${(parseFloat(formatEther(quotePrice)) * ethPrice).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Glaze button */}
                {isConnected ? (
                  <button
                    className="slab-button flex-1 text-sm font-semibold"
                    onClick={handleGlaze}
                    disabled={isGlazing || quotePrice === 0n}
                  >
                    {isGlazing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        ...
                      </span>
                    ) : (
                      "Mine"
                    )}
                  </button>
                ) : (
                  <button className="slab-button flex-1 text-sm font-semibold" onClick={handleConnect}>
                    Connect Wallet
                  </button>
                )}
              </div>

              {/* Error */}
              {connectionError && (
                <div className="mt-3 p-3 rounded-[var(--radius)] bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)]">
                  <p className="text-[12px] text-[hsl(var(--destructive))]">{connectionError}</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="slab-panel rounded-[var(--radius)] mb-6 px-3 py-4">
              <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">Recent Activity</div>
              <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">Latest 10 glaze transactions.</p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] tracking-wide text-muted-foreground border-b border-[hsl(var(--foreground)/0.08)]">
                      <th className="pb-3 font-medium w-8 pl-2 pr-3">#</th>
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Message</th>
                      <th className="pb-3 font-medium text-right">Spent</th>
                      <th className="pb-3 font-medium text-right">Earned</th>
                      <th className="pb-3 font-medium text-right pr-2">Mined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feed.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-[13px]">
                          No recent activity
                        </td>
                      </tr>
                    ) : (
                      feed.slice(0, 10).map((item, idx) => {
                        const profile = feedProfiles[item.miner.toLowerCase()];
                        const isLive = idx === 0;
                        let displayPrice = "0.000";
                        try { displayPrice = parseFloat(item.price).toFixed(3); } catch {}

                        // Live row: earned = current rebate price (ticks down), mined = accrued donuts (ticks up)
                        const liveEarned = parseFloat(formatEther(quotePrice)) * 0.8;
                        const liveMined = accruedDonutsStr;

                        return (
                          <tr
                            key={item.id}
                            className={`border-b border-[hsl(var(--foreground)/0.05)] transition-colors ${
                              isLive
                                ? "bg-[hsl(var(--primary)/0.05)] hover:bg-[hsl(var(--primary)/0.1)]"
                                : "hover:bg-[hsl(var(--foreground)/0.03)]"
                            }`}
                          >
                            <td className="py-3 text-xs tabular-nums pl-2 pr-3">
                              {isLive ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                              ) : (
                                <span className="text-muted-foreground">{idx + 1}</span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <ProfileAvatar profile={profile || null} size={24} />
                                <span className="text-sm font-medium truncate">
                                  {profile?.username || truncateAddress(item.miner)}
                                </span>
                                {isLive && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider text-primary bg-[hsl(var(--primary)/0.2)] px-1.5 py-0.5 rounded">
                                    Live
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`py-3 text-sm max-w-[200px] truncate ${isLive ? "" : "text-muted-foreground"}`}>
                              {item.uri || "—"}
                            </td>
                            <td className="py-3 text-sm text-right tabular-nums font-mono">
                              Ξ{displayPrice}
                            </td>
                            <td className="py-3 text-sm text-right tabular-nums font-mono">
                              Ξ{isLive ? liveEarned.toFixed(3) : (item.earned ? parseFloat(item.earned).toFixed(3) : "0.000")}
                            </td>
                            <td className="py-3 text-sm text-right tabular-nums font-mono pr-2">
                              <span className="inline-flex items-center justify-end gap-1">
                                <DonutMark size={10} />
                                {isLive ? liveMined : (item.mined ? parseFloat(item.mined).toLocaleString() : "0")}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
        </div>
      </div>
    </main>
  );
}

// ─── Activity row ───────────────────────────────────────────────────────────

function ActivityRow({
  item,
  index,
  profile,
}: {
  item: FeedItem;
  index: number;
  profile?: FarcasterProfile;
}) {
  return (
    <div className="grid grid-cols-[32px_1fr_1.5fr_0.8fr_0.8fr_0.8fr] gap-3 px-2 py-3 items-center text-[13px] hover:bg-[hsl(var(--foreground)/0.03)] transition-colors">
      <span className="text-muted-foreground tabular-nums font-mono text-[12px]">
        {index}
      </span>

      <div className="flex items-center gap-2 min-w-0">
        <ProfileAvatar profile={profile || null} size={24} />
        <span className="truncate text-[13px]">
          {profile?.username
            ? `@${profile.username}`
            : truncateAddress(item.miner)}
        </span>
      </div>

      <span className="text-muted-foreground text-[12px] truncate">
        {item.uri || "--"}
      </span>

      <span className="text-right tabular-nums font-mono text-[13px]">
        {formatGraphEth(item.price)}
      </span>

      <span className="text-right tabular-nums font-mono text-[13px]">
        {formatGraphEth(item.earned)}
      </span>

      <span className="text-right tabular-nums font-mono text-[13px] text-primary">
        {formatGraphDonut(item.mined)}
      </span>
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

function LeaderboardSection({
  feed,
  profiles,
  ethPrice,
}: {
  feed: FeedItem[];
  profiles: Record<string, FarcasterProfile>;
  ethPrice: number;
}) {
  // Aggregate by miner address
  const leaderboard = useMemo(() => {
    const map = new Map<
      string,
      { address: string; spent: number; earned: number; mined: number; count: number }
    >();

    for (const item of feed) {
      const addr = item.miner.toLowerCase();
      const existing = map.get(addr) || {
        address: addr,
        spent: 0,
        earned: 0,
        mined: 0,
        count: 0,
      };
      existing.spent += parseFloat(item.price);
      existing.earned += parseFloat(item.earned);
      existing.mined += parseFloat(item.mined);
      existing.count += 1;
      map.set(addr, existing);
    }

    return [...map.values()].sort((a, b) => b.mined - a.mined);
  }, [feed]);

  return (
    <>
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_0.8fr_0.8fr_0.8fr_64px] gap-3 px-2 pb-2 text-muted-foreground text-[11px] font-medium tracking-wide uppercase border-b border-[hsl(var(--foreground)/0.08)]">
        <span>#</span>
        <span>Miner</span>
        <span className="text-right">Spent</span>
        <span className="text-right">Earned</span>
        <span className="text-right">Mined</span>
        <span className="text-right">Glazes</span>
      </div>

      {leaderboard.map((entry, idx) => {
        const profile = profiles[entry.address];
        return (
          <div
            key={entry.address}
            className="grid grid-cols-[32px_1fr_0.8fr_0.8fr_0.8fr_64px] gap-3 px-2 py-3 items-center text-[13px] hover:bg-[hsl(var(--foreground)/0.03)] transition-colors"
          >
            <span className="text-muted-foreground tabular-nums font-mono text-[12px]">
              {idx + 1}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <ProfileAvatar profile={profile || null} size={24} />
              <span className="truncate">
                {profile?.username
                  ? `@${profile.username}`
                  : truncateAddress(entry.address)}
              </span>
            </div>
            <span className="text-right tabular-nums font-mono">
              {entry.spent.toFixed(4)}
            </span>
            <span className="text-right tabular-nums font-mono">
              {entry.earned.toFixed(4)}
            </span>
            <span className="text-right tabular-nums font-mono text-primary">
              {entry.mined.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-right tabular-nums font-mono text-muted-foreground">
              {entry.count}
            </span>
          </div>
        );
      })}
    </>
  );
}
