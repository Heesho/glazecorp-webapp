"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useReadContract } from "wagmi";
import { formatUnits, zeroAddress } from "viem";
import { base } from "wagmi/chains";
import { Loader2 } from "lucide-react";

import { useAuctions, type StrategyAuctionData } from "@/features/auctions";
import {
  PAYMENT_TOKEN_SYMBOLS,
  TOKEN_ADDRESSES,
  POLLING_INTERVAL_MS,
} from "@/config/govern-constants";
import { getFarcasterConnector } from "@/lib/farcaster-wallet";
import { MINER_MULTICALL_ADDRESS, MINER_MULTICALL_ABI } from "@/config/miner-constants";

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

function getTokenIcon(address: string): string | null {
  return TOKEN_ICONS[address.toLowerCase()] ?? TOKEN_ICONS[address] ?? null;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTokenAmount(value: bigint, decimals: number): string {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  if (num > 0) return num.toFixed(8);
  return "0";
}

function formatWeth(value: bigint): string {
  return formatTokenAmount(value, 18);
}

function getTokenSymbol(address: string): string {
  return PAYMENT_TOKEN_SYMBOLS[address.toLowerCase()] ?? "???";
}

/**
 * Compute profit % = ((revenue - price) / price) * 100
 * Revenue = totalPotentialRevenue (WETH), price = currentPrice (payment token)
 * This is an approximate comparison; in production you'd use oracle prices.
 * For display we compare raw token amounts since both sides are priced in WETH terms.
 */
function getPaymentTokenUsdPrice(
  token: `0x${string}`,
  ethPrice: number,
  donutPriceUsd: number,
  btcPrice: number,
  tokenPrices?: Record<string, number>,
): number {
  const t = token.toLowerCase();
  if (t === TOKEN_ADDRESSES.weth.toLowerCase()) return ethPrice;
  if (t === TOKEN_ADDRESSES.usdc.toLowerCase()) return 1;
  if (t === TOKEN_ADDRESSES.cbbtc.toLowerCase()) return btcPrice || 0;
  if (t === TOKEN_ADDRESSES.donut.toLowerCase()) return donutPriceUsd;
  if (t === TOKEN_ADDRESSES.donutEthLp.toLowerCase()) return donutPriceUsd * 2;
  if (t === TOKEN_ADDRESSES.aero.toLowerCase()) return tokenPrices?.aero || 0;
  if (t === TOKEN_ADDRESSES.clanker.toLowerCase()) return tokenPrices?.clanker || 0;
  if (t === TOKEN_ADDRESSES.bnkr.toLowerCase()) return tokenPrices?.bnkr || 0;
  if (t === TOKEN_ADDRESSES.qr.toLowerCase()) return tokenPrices?.qr || 0;
  return 0;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function DonutSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="16" fill="#f472b6" />
      <circle cx="16" cy="16" r="6" fill="hsl(var(--background))" />
    </svg>
  );
}

function PaymentTokenIcon({
  address,
  size = "w-6 h-6",
}: {
  address: string;
  size?: string;
}) {
  const isDonut =
    address.toLowerCase() === TOKEN_ADDRESSES.donut.toLowerCase();
  const isDonutEthLp =
    address.toLowerCase() === TOKEN_ADDRESSES.donutEthLp.toLowerCase();
  const iconUrl = getTokenIcon(address);

  if (isDonutEthLp) {
    return (
      <div className="flex items-center -space-x-1">
        <DonutSvg className={`${size} shrink-0 z-[1]`} />
        <img src={WETH_ICON} alt="ETH" className={`${size} rounded-full shrink-0`} />
      </div>
    );
  }
  if (isDonut) {
    return <DonutSvg className={size} />;
  }
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

function AuctionCard({
  strategy,
  isConnected,
  isBusy,
  buyStep,
  buyResult,
  selectedStrategy,
  needsApprovalForToken,
  handleApproveAndBuy,
  handleBuyForStrategy,
  handleConnect,
  ethPrice,
  donutPriceUsd,
  btcPrice,
  tokenPrices,
}: {
  strategy: StrategyAuctionData;
  isConnected: boolean;
  isBusy: boolean;
  buyStep: string;
  buyResult: "success" | "failure" | null;
  selectedStrategy: StrategyAuctionData | null;
  needsApprovalForToken: (token: `0x${string}`, amount: bigint) => boolean;
  handleApproveAndBuy: (s: StrategyAuctionData, amount: bigint) => void;
  handleBuyForStrategy: (s: StrategyAuctionData, amount: bigint) => void;
  handleConnect: () => void;
  ethPrice: number;
  donutPriceUsd: number;
  btcPrice: number;
  tokenPrices: Record<string, number>;
}) {
  const symbol = getTokenSymbol(strategy.paymentToken);
  const payTokenPrice = getPaymentTokenUsdPrice(strategy.paymentToken, ethPrice, donutPriceUsd, btcPrice, tokenPrices);
  const payNum = Number(formatUnits(strategy.currentPrice, strategy.paymentTokenDecimals));
  const payUsd = payNum * payTokenPrice;
  const getNum = Number(formatUnits(strategy.revenueBalance, 18));
  const getUsd = getNum * ethPrice;
  const profitPct = payUsd > 0 ? ((getUsd - payUsd) / payUsd) * 100 : null;
  const currentPrice = strategy.currentPrice;
  const revenue = strategy.totalPotentialRevenue;
  const balance = strategy.accountPaymentTokenBalance;
  const isSelected =
    selectedStrategy?.strategy.toLowerCase() ===
    strategy.strategy.toLowerCase();
  const isThisBusy = isBusy && isSelected;

  const profitColor =
    profitPct !== null
      ? profitPct >= 0
        ? "text-emerald-400"
        : "text-red-400"
      : "text-muted-foreground";

  const handleBuyClick = () => {
    if (!isConnected) {
      handleConnect();
      return;
    }
    // Use currentPrice as maxPaymentAmount (with 5% slippage buffer)
    const maxPayment = (currentPrice * 105n) / 100n;
    if (needsApprovalForToken(strategy.paymentToken, maxPayment)) {
      handleApproveAndBuy(strategy, maxPayment);
    } else {
      handleBuyForStrategy(strategy, maxPayment);
    }
  };

  const buttonLabel = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (isThisBusy) {
      if (buyStep === "approving") return "Approving...";
      if (buyStep === "buying") return "Buying...";
      return "Processing...";
    }
    if (isSelected && buyResult === "success") return "Bought!";
    if (isSelected && buyResult === "failure") return "Failed";
    if (currentPrice === 0n) return "No Auction";
    if (balance < currentPrice) return "Insufficient Balance";
    return "Buy Position";
  }, [
    isConnected,
    isThisBusy,
    buyStep,
    isSelected,
    buyResult,
    currentPrice,
    balance,
  ]);

  const isDisabled =
    !isConnected
      ? false
      : isThisBusy ||
        currentPrice === 0n ||
        balance < currentPrice ||
        (isSelected && buyResult !== null);

  return (
    <div className="slab-panel rounded-[var(--radius)] p-4 flex flex-col gap-3">
      {/* Header: symbol + profit badge */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[15px]">{symbol}</span>
        {profitPct !== null && (
          <span
            className={`text-[12px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-full ${profitColor} bg-[hsl(var(--foreground)/0.05)]`}
          >
            {profitPct >= 0 ? "+" : ""}
            {profitPct.toFixed(1)}%
          </span>
        )}
      </div>

      {/* PAY / GET section */}
      <div className="grid grid-cols-2 gap-3">
        {/* PAY */}
        <div className="space-y-1">
          <div className="text-muted-foreground text-[12px]">PAY</div>
          <div className="flex items-center gap-1.5">
            <PaymentTokenIcon
              address={strategy.paymentToken}
              size="w-4 h-4"
            />
            <span className="font-semibold text-[15px] tabular-nums font-mono">
              {formatTokenAmount(currentPrice, strategy.paymentTokenDecimals)}
            </span>
          </div>
          <div className="text-muted-foreground text-[11px] font-mono tabular-nums">
            {payUsd > 0 ? `$${payUsd.toFixed(2)}` : symbol}
          </div>
        </div>

        {/* GET */}
        <div className="space-y-1">
          <div className="text-muted-foreground text-[12px]">GET</div>
          <div className="flex items-center gap-1.5">
            <img
              src={WETH_ICON}
              alt="WETH"
              className="w-4 h-4 rounded-full"
            />
            <span className="font-semibold text-[15px] tabular-nums font-mono">
              {formatWeth(revenue)}
            </span>
          </div>
          <div className="text-muted-foreground text-[11px] font-mono tabular-nums">
            {getUsd > 0 ? `$${getUsd.toFixed(2)}` : "WETH"}
          </div>
        </div>
      </div>

      {/* Balance row */}
      <div className="flex justify-between items-center border-t border-[hsl(var(--foreground)/0.06)] pt-2">
        <span className="text-muted-foreground text-[12px]">Balance</span>
        <span className="text-[13px] font-mono tabular-nums">
          {formatTokenAmount(balance, strategy.paymentTokenDecimals)} {symbol}
        </span>
      </div>

      {/* Buy button */}
      <button
        className={`slab-button w-full py-2.5 text-[14px] font-semibold rounded-[var(--radius)] flex items-center justify-center gap-2 ${
          isSelected && buyResult === "success"
            ? "!bg-emerald-500/20 !text-emerald-400"
            : isSelected && buyResult === "failure"
              ? "!bg-red-500/20 !text-red-400"
              : ""
        }`}
        onClick={handleBuyClick}
        disabled={isDisabled}
      >
        {isThisBusy && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {buttonLabel}
      </button>
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────────────────────

export default function AuctionPage() {
  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();

  const [ethPrice, setEthPrice] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  // Fetch donut price from miner multicall
  const { data: minerState } = useReadContract({
    address: MINER_MULTICALL_ADDRESS as `0x${string}`,
    abi: MINER_MULTICALL_ABI,
    functionName: "getMiner",
    args: [address ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });
  const donutPriceInEth = (minerState as any)?.donutPrice ?? 0n;
  const donutPriceUsd = ethPrice > 0 && donutPriceInEth > 0n
    ? Number(donutPriceInEth) / 1e18 * ethPrice
    : 0;

  // Fetch ETH + BTC price
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices");
        if (res.ok) {
          const data = await res.json();
          if (data.eth > 0) setEthPrice(data.eth);
          if (data.btc > 0) setBtcPrice(data.btc);
          setTokenPrices({
            aero: data.aero || 0,
            clanker: data.clanker || 0,
            bnkr: data.bnkr || 0,
            qr: data.qr || 0,
          });
        }
      } catch {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const {
    strategies,
    selectedStrategy,
    isLoading,
    buyStep,
    buyResult,
    isBusy,
    needsApprovalForToken,
    handleApproveAndBuy,
    handleBuyForStrategy,
  } = useAuctions(address);

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
              Auction
            </h1>
            <p className="page-subtitle">
              Buy strategy positions through dutch auctions.
            </p>
          </div>

          {/* ── loading state ─────────────────────────────────────── */}
          {isLoading && strategies.length === 0 && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[14px]">Loading auctions...</span>
            </div>
          )}

          {/* ── empty state ───────────────────────────────────────── */}
          {!isLoading && strategies.length === 0 && (
            <div className="slab-panel rounded-[var(--radius)] p-8 text-center">
              <p className="text-muted-foreground text-[14px]">
                No active auctions at the moment.
              </p>
            </div>
          )}

          {/* ── auction grid ──────────────────────────────────────── */}
          {strategies.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...strategies].sort((a, b) => {
                const payA = Number(formatUnits(a.currentPrice, a.paymentTokenDecimals)) * getPaymentTokenUsdPrice(a.paymentToken, ethPrice, donutPriceUsd, btcPrice);
                const getA = Number(formatUnits(a.revenueBalance, 18)) * ethPrice;
                const roiA = payA > 0 ? ((getA - payA) / payA) * 100 : -Infinity;
                const payB = Number(formatUnits(b.currentPrice, b.paymentTokenDecimals)) * getPaymentTokenUsdPrice(b.paymentToken, ethPrice, donutPriceUsd, btcPrice);
                const getB = Number(formatUnits(b.revenueBalance, 18)) * ethPrice;
                const roiB = payB > 0 ? ((getB - payB) / payB) * 100 : -Infinity;
                return roiB - roiA;
              }).map((strategy) => (
                <AuctionCard
                  key={strategy.strategy}
                  strategy={strategy}
                  isConnected={isConnected}
                  isBusy={isBusy}
                  buyStep={buyStep}
                  buyResult={buyResult}
                  selectedStrategy={selectedStrategy}
                  needsApprovalForToken={needsApprovalForToken}
                  handleApproveAndBuy={handleApproveAndBuy}
                  handleBuyForStrategy={handleBuyForStrategy}
                  handleConnect={handleConnect}
                  ethPrice={ethPrice}
                  donutPriceUsd={donutPriceUsd}
                  btcPrice={btcPrice}
                  tokenPrices={tokenPrices}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
