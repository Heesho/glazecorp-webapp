"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { formatUnits } from "viem";
import { Loader2 } from "lucide-react";

import { useSystemData, useFlushAndDistribute } from "@/features/system";
import { PAYMENT_TOKEN_SYMBOLS, TOKEN_ADDRESSES } from "@/config/govern-constants";
import { getFarcasterConnector } from "@/lib/farcaster-wallet";

// ─── constants ──────────────────────────────────────────────────────────────

const TOKEN_ICONS: Record<string, string> = {
  "0x4200000000000000000000000000000000000006":
    "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png", // WETH
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913":
    "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png", // USDC
  "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf":
    "https://coin-images.coingecko.com/coins/images/40143/small/cbbtc.webp", // cbBTC
  "0x2b5050f01d64fbb3e4ac44dc07f0732bfb5ecadf":
    "https://coin-images.coingecko.com/coins/images/66513/small/_QR_white_circle__transparent_bg_%288%29.png", // QR
  "0x940181a94A35A4569E4529A3CDfB74e38FD98631":
    "https://coin-images.coingecko.com/coins/images/31745/small/token.png", // AERO
  "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb":
    "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/295953fa-15ed-4d3c-241d-b6c1758c6200/original", // CLANKER
  "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b":
    "https://coin-images.coingecko.com/coins/images/52626/small/bankr-static.png", // BNKR
};

const WETH_ICON =
  "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png";

const STRATEGY_COLORS = [
  "#f472b6", // pink
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#fb923c", // orange
  "#2dd4bf", // teal
  "#f87171", // red
];

function getTokenIcon(address: string): string | null {
  return TOKEN_ICONS[address.toLowerCase()] ?? TOKEN_ICONS[address] ?? null;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatWeth(value: bigint): string {
  const num = Number(formatUnits(value, 18));
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  if (num > 0) return num.toFixed(8);
  return "0";
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  if (value > 0) return `$${value.toFixed(4)}`;
  return "$0.00";
}

function getTokenSymbol(address: string): string {
  return PAYMENT_TOKEN_SYMBOLS[address.toLowerCase()] ?? "???";
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(seconds: bigint): string {
  const s = Number(seconds);
  if (s <= 0) return "Now";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function PaymentTokenIcon({
  address,
  size = "w-6 h-6",
}: {
  address: string;
  size?: string;
}) {
  const isDonut = address.toLowerCase() === TOKEN_ADDRESSES.donut.toLowerCase();
  const isDonutEthLp = address.toLowerCase() === TOKEN_ADDRESSES.donutEthLp.toLowerCase();

  if (isDonutEthLp) {
    return (
      <div className="flex items-center -space-x-1.5">
        <svg viewBox="0 0 32 32" className={`${size} shrink-0 z-[1]`}>
          <circle cx="16" cy="16" r="16" fill="#f472b6" />
          <circle cx="16" cy="16" r="6" fill="hsl(var(--background))" />
        </svg>
        <img
          src={TOKEN_ICONS["0x4200000000000000000000000000000000000006"]}
          alt="ETH"
          className={`${size} rounded-full shrink-0`}
        />
      </div>
    );
  }

  if (isDonut) {
    return (
      <svg viewBox="0 0 32 32" className={size}>
        <circle cx="16" cy="16" r="16" fill="#f472b6" />
        <circle cx="16" cy="16" r="6" fill="hsl(var(--background))" />
      </svg>
    );
  }

  const iconUrl = getTokenIcon(address);
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={getTokenSymbol(address)}
        className={`${size} rounded-full`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full bg-[hsl(var(--foreground)/0.1)]`}
    />
  );
}

// ─── main page ──────────────────────────────────────────────────────────────

export default function SystemPage() {
  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();

  const [ethPrice, setEthPrice] = useState(0);

  // Fetch ETH price (same pattern as auction page)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        if (res.ok) {
          const data = await res.json();
          if (data.eth > 0) setEthPrice(data.eth);
        }
      } catch {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const { systemOverview, strategies, refetchAll, isLoading, hasError, error } =
    useSystemData();

  const { txStep, txResult, isBusy, handleFlushAndDistribute } =
    useFlushAndDistribute(address, refetchAll);

  const handleConnect = async () => {
    const injected = connectors.find((c) => c.id === "injected");
    const farcaster = getFarcasterConnector(connectors);
    const connector = farcaster || injected;
    if (connector) {
      try {
        await connectAsync({ connector });
      } catch (e) {
        console.error("Connect failed:", e);
      }
    }
  };

  // Epoch progress
  const epochProgress = useMemo(() => {
    if (!systemOverview) return 0;
    const duration = Number(systemOverview.epochDuration);
    const remaining = Number(systemOverview.timeUntilNextEpoch);
    if (duration <= 0) return 0;
    return Math.max(0, Math.min(100, ((duration - remaining) / duration) * 100));
  }, [systemOverview]);

  // Distribute button label
  const distributeLabel = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (txResult === "success") return "Success!";
    if (txResult === "failure") return "Failed";
    if (isBusy) return "Distributing...";
    return "Distribute Revenue";
  }, [isConnected, txResult, isBusy]);

  const handleDistributeClick = () => {
    if (!isConnected) {
      handleConnect();
      return;
    }
    handleFlushAndDistribute();
  };

  const routerWethBalance = systemOverview?.revenueRouterWethBalance ?? 0n;
  const routerWethUsd =
    Number(formatUnits(routerWethBalance, 18)) * ethPrice;

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
            <h1 className="font-display text-[2.75rem] font-semibold leading-[0.9] tracking-[-0.04em]">
              System
            </h1>
            <p className="page-subtitle">
              Monitor and control WETH flow through the governance system.
            </p>
          </div>

          {/* ── loading state ─────────────────────────────────────── */}
          {isLoading && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[14px]">Loading system data...</span>
            </div>
          )}

          {/* ── error state ───────────────────────────────────────── */}
          {hasError && (
            <div className="slab-panel rounded-[var(--radius)] p-4 mb-6 border border-red-500/30">
              <div className="text-red-400 text-sm">
                Error loading system data. The contract may not be deployed or the
                functions may not exist.
              </div>
              <div className="text-red-400/60 text-xs mt-2 font-mono">
                {error?.message || "Unknown error"}
              </div>
            </div>
          )}

          {!isLoading && (
            <div className="flex flex-col gap-4">
              {/* ── 1. Revenue Router + Epoch + Voter Reward Split ──── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue Router */}
                <div className="slab-panel rounded-[var(--radius)] p-5">
                  <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em] mb-1">
                    Revenue Router
                  </h2>
                  <p className="text-muted-foreground text-[13px] mb-4">
                    Protocol revenue waiting to be distributed.
                  </p>

                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={WETH_ICON}
                      alt="WETH"
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <div className="font-semibold text-[15px] tabular-nums font-mono">
                        {formatWeth(routerWethBalance)} WETH
                      </div>
                      <div className="text-muted-foreground text-[12px] font-mono tabular-nums">
                        {formatUsd(routerWethUsd)}
                      </div>
                    </div>
                  </div>

                  <button
                    className={`slab-button w-full py-3 text-[14px] font-semibold rounded-[var(--radius)] flex items-center justify-center gap-2 ${
                      txResult === "success"
                        ? "!bg-emerald-500/20 !text-emerald-400"
                        : txResult === "failure"
                          ? "!bg-red-500/20 !text-red-400"
                          : ""
                    }`}
                    onClick={handleDistributeClick}
                    disabled={isBusy || txResult !== null}
                  >
                    {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {distributeLabel}
                  </button>
                </div>

                {/* Epoch Timing */}
                <div className="slab-panel rounded-[var(--radius)] p-5">
                  <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em] mb-4">
                    Epoch
                  </h2>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-[hsl(var(--foreground)/0.08)] mb-4 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${epochProgress}%` }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[12px]">
                        Started
                      </span>
                      <span className="font-semibold text-[15px] tabular-nums font-mono">
                        {systemOverview
                          ? formatDate(systemOverview.currentEpochStart)
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[12px]">
                        Next
                      </span>
                      <span className="font-semibold text-[15px] tabular-nums font-mono text-primary">
                        {systemOverview
                          ? formatDate(systemOverview.nextEpochStart)
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-[12px]">
                        Time Remaining
                      </span>
                      <span className="font-semibold text-[15px] tabular-nums font-mono">
                        {systemOverview
                          ? formatCountdown(systemOverview.timeUntilNextEpoch)
                          : "--"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voter Reward Split */}
                <div className="slab-panel rounded-[var(--radius)] p-5">
                  <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em] mb-4">
                    Voter Reward Split
                  </h2>

                  <div className="font-semibold text-[2.75rem] tabular-nums font-mono leading-none">
                    {systemOverview
                      ? `${Number(systemOverview.bribeSplit) / 100}%`
                      : "--"}
                  </div>
                  <p className="text-muted-foreground text-[13px] mt-2">
                    Percentage of auction payments going to voter rewards.
                  </p>
                </div>
              </div>

              {/* ── 2. Weekly Revenue ──────────────────────────────── */}
              {strategies.length > 0 && (
                <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
                  <div className="flex items-center justify-between px-1 mb-4">
                    <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em]">
                      Weekly Revenue
                    </h2>
                    <span className="text-primary font-semibold text-[18px] tabular-nums font-mono">
                      ~{formatUsd(strategies.reduce((sum, s) => {
                        const wethNum = Number(formatUnits(s.strategyTotalPotentialWeth, 18));
                        return sum + wethNum * ethPrice;
                      }, 0))}
                    </span>
                  </div>

                  {/* Strategy rows */}
                  <div className="space-y-1">
                    {strategies.map((s) => {
                      const symbol = getTokenSymbol(s.paymentToken);
                      const wethNum = Number(formatUnits(s.strategyTotalPotentialWeth, 18));
                      const weeklyUsd = wethNum * ethPrice;
                      const voteWeight = Number(s.votePercent) / 1e18;

                      return (
                        <div
                          key={s.strategy}
                          className="grid grid-cols-[36px_1fr_80px_90px] gap-x-6 items-center px-1 py-2.5 rounded-[var(--radius)] hover:bg-[hsl(var(--foreground)/0.03)] transition-colors"
                        >
                          <div className="flex items-center">
                            <PaymentTokenIcon
                              address={s.paymentToken}
                              size="w-8 h-8"
                            />
                          </div>
                          <div className="text-[13px] font-medium truncate">
                            {symbol}
                          </div>
                          <div className="text-[13px] tabular-nums font-mono text-right">
                            {voteWeight.toFixed(1)}%
                          </div>
                          <div className="text-right">
                            <div className="text-[15px] font-semibold tabular-nums font-mono">
                              {formatUsd(weeklyUsd)}
                            </div>
                            <div className="text-muted-foreground text-[11px] font-mono">
                              /week
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
