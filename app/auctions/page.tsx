"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { formatUnits, zeroAddress, type Address } from "viem";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, StrategyIcon } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { useAuctions, type StrategyAuctionData } from "@/features/auctions/hooks/useAuctions";
import { useFranchiseAuctions, useFranchiseAuctionBuy, type FranchiseAuctionItem } from "@/features/franchise/hooks/useFranchiseAuctions";
import { MULTICALL_ABI, MULTICALL_ADDRESS, TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { fetchEthPrice } from "@/lib/api/price";
import { getLpTokenPriceUsd } from "@/lib/api/uniswapV2";
import { ipfsToHttp, fetchRigMetadata } from "@/lib/api/launchpad";
import { POLLING_INTERVAL_MS } from "@/config/constants";

const ITEMS_PER_PAGE = 8;

// Unified auction type
type UnifiedAuction = {
  id: string;
  type: "strategy" | "franchise";
  name: string;
  payUsd: number;
  getUsd: number;
  profitPercent: number;
  profitUsd: number;
  payAmount: bigint;
  payDecimals: number;
  getAmount: bigint;
  paymentToken: Address;
  paymentSymbol: string;
  hasSufficientBalance: boolean;
  balance: bigint;
  acquireLink: string;
  imageUrl?: string | null;
  // Strategy-specific
  strategyData?: StrategyAuctionData;
  // Franchise-specific
  franchiseData?: FranchiseAuctionItem;
};

const formatTokenAmount = (value: bigint, decimals = 18, maxDecimals = 2) => {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 0.01 && num > 0) return num.toFixed(4);
  return num.toFixed(maxDecimals);
};

// Get USD price for a payment token
const getPaymentTokenUsdPrice = (
  token: Address,
  ethPrice: number,
  donutPriceUsd: number,
  lpPriceUsd: number
): number => {
  const tokenLower = token.toLowerCase();
  if (tokenLower === TOKEN_ADDRESSES.weth.toLowerCase()) return ethPrice;
  if (tokenLower === TOKEN_ADDRESSES.usdc.toLowerCase()) return 1;
  if (tokenLower === TOKEN_ADDRESSES.donut.toLowerCase()) return donutPriceUsd;
  if (tokenLower === TOKEN_ADDRESSES.donutEthLp.toLowerCase()) return lpPriceUsd;
  if (tokenLower === TOKEN_ADDRESSES.cbbtc.toLowerCase()) return ethPrice * 28;
  return 0;
};

// LP token icon for franchise auctions
function LpTokenIcon({ imageUrl, symbol }: { imageUrl?: string | null; symbol?: string }) {
  return (
    <div className="relative flex items-center">
      <div className="w-5 h-5 rounded-full bg-corp-800 flex items-center justify-center overflow-hidden z-[2]">
        {imageUrl ? (
          <img src={imageUrl} alt={symbol} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[7px] font-bold text-glaze-400">{symbol?.slice(0, 2) || "?"}</span>
        )}
      </div>
      <div className="w-4 h-4 rounded-full bg-glaze-500 flex items-center justify-center -ml-2 z-[1]">
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
      </div>
    </div>
  );
}

// WETH icon
function WethIcon({ size = 18 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center bg-[#627EEA] overflow-hidden"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" className="w-3 h-3" fill="none">
        <path d="M16 4L16 12.87L23 16.22L16 4Z" fill="white" fillOpacity="0.6" />
        <path d="M16 4L9 16.22L16 12.87L16 4Z" fill="white" />
        <path d="M16 21.97L16 28L23 17.62L16 21.97Z" fill="white" fillOpacity="0.6" />
        <path d="M16 28L16 21.97L9 17.62L16 28Z" fill="white" />
      </svg>
    </div>
  );
}

interface AuctionCardProps {
  auction: UnifiedAuction;
  userAddress?: Address;
  onBuy: () => void;
  isBusy: boolean;
  isActive: boolean;
  buyStep: string;
  buyResult: "success" | "failure" | null;
}

function AuctionCard({
  auction,
  userAddress,
  onBuy,
  isBusy,
  isActive,
  buyStep,
  buyResult,
}: AuctionCardProps) {
  const cardIsBusy = isBusy && isActive;

  const getButtonText = () => {
    if (isActive) {
      if (buyResult === "success") return "SUCCESS";
      if (buyResult === "failure") return "FAILED";
      if (buyStep === "approving") return "APPROVING...";
      if (buyStep === "buying" || buyStep === "confirming") return "BUYING...";
    }
    if (!userAddress) return "CONNECT WALLET";
    return "BUY";
  };

  const canBuy = userAddress && auction.payAmount > 0n && auction.hasSufficientBalance;

  // Get display name for LP
  const displayName = auction.type === "franchise"
    ? `${auction.name}-DONUT LP`
    : auction.paymentSymbol;

  return (
    <Card noPadding>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {auction.type === "franchise" ? (
              <LpTokenIcon imageUrl={auction.imageUrl} symbol={auction.name} />
            ) : (
              <StrategyIcon paymentToken={auction.paymentToken} size={24} />
            )}
            <span className="text-sm font-bold text-white truncate max-w-[200px]">
              {displayName}
            </span>
          </div>
          <span
            className={`text-base font-bold font-mono ${
              auction.profitUsd >= 0 ? "text-glaze-400" : "text-red-400"
            }`}
          >
            {auction.profitUsd >= 0 ? "+" : ""}{auction.profitPercent.toFixed(1)}%
          </span>
        </div>

        {/* PAY / GET */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2">
            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">PAY</div>
            <div className="text-sm font-bold font-mono text-white">
              {formatTokenAmount(auction.payAmount, auction.payDecimals, 3)}
            </div>
            <div className="text-xs font-mono text-zinc-500">${auction.payUsd.toFixed(2)}</div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2">
            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">GET</div>
            <div className="flex items-center gap-1.5">
              <WethIcon size={16} />
              <span className="text-sm font-bold font-mono text-glaze-400">
                {formatTokenAmount(auction.getAmount, 18, 5)}
              </span>
            </div>
            <div className="text-xs font-mono text-zinc-500">${auction.getUsd.toFixed(2)}</div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-zinc-500">Your Balance:</span>
          <span className={auction.hasSufficientBalance ? "text-white" : "text-red-400"}>
            {formatTokenAmount(auction.balance, auction.payDecimals, 4)} {auction.type === "franchise" ? "LP" : auction.paymentSymbol}
          </span>
        </div>

        {/* Get Link + Buy */}
        <div className="flex items-center justify-between gap-3">
          <a
            href={auction.acquireLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-glaze-400 hover:text-glaze-300"
            onClick={(e) => e.stopPropagation()}
          >
            {auction.type === "franchise" || auction.paymentToken.toLowerCase() === TOKEN_ADDRESSES.donutEthLp.toLowerCase() ? "Get LP" : "Get"}
            <ExternalLink size={12} />
          </a>
          <Button
            variant="primary"
            onClick={onBuy}
            disabled={cardIsBusy || !canBuy}
            className="!py-2 !px-4 !text-sm"
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AuctionsPage() {
  const { address: userAddress } = useAccount();
  const [ethPrice, setEthPrice] = useState(0);
  const [lpPriceUsd, setLpPriceUsd] = useState(0);
  const [donutPriceUsd, setDonutPriceUsd] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);
  const [franchiseImages, setFranchiseImages] = useState<Record<string, string | null>>({});

  // Fetch miner state to get donutPrice
  const { data: minerState } = useReadContract({
    address: MULTICALL_ADDRESS,
    abi: MULTICALL_ABI,
    functionName: "getMiner",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  const donutPriceInEth = (minerState as { donutPrice?: bigint } | undefined)?.donutPrice ?? 0n;

  // Strategy auctions
  const {
    strategies,
    isLoading: isLoadingStrategies,
    buyStep: strategyBuyStep,
    buyResult: strategyBuyResult,
    isBusy: strategyIsBusy,
    needsApprovalForToken,
    handleApproveAndBuy: strategyApproveAndBuy,
    handleBuyForStrategy,
    getPaymentTokenSymbol,
  } = useAuctions(userAddress);

  // Franchise auctions
  const { auctions: franchiseAuctions, isLoading: isLoadingFranchise, refetch: refetchFranchise } = useFranchiseAuctions(userAddress);

  // Franchise buy hook - we'll need to handle this per-auction
  const [selectedFranchiseRig, setSelectedFranchiseRig] = useState<Address | undefined>();
  const selectedFranchiseAuction = franchiseAuctions.find((a) => a.rigAddress === selectedFranchiseRig);

  const {
    buyStep: franchiseBuyStep,
    buyResult: franchiseBuyResult,
    isBusy: franchiseIsBusy,
    handleApproveAndBuy: franchiseApproveAndBuy,
  } = useFranchiseAuctionBuy(
    selectedFranchiseRig,
    userAddress,
    selectedFranchiseAuction?.auctionState,
    refetchFranchise
  );

  // Fetch ETH price and LP price
  useEffect(() => {
    const fetchPrices = async () => {
      const ethPriceValue = await fetchEthPrice();
      if (ethPriceValue > 0) {
        setEthPrice(ethPriceValue);

        if (donutPriceInEth > 0n) {
          const donutUsd = Number(donutPriceInEth) / 1e18 * ethPriceValue;
          setDonutPriceUsd(donutUsd);
          const lpPrice = await getLpTokenPriceUsd(
            TOKEN_ADDRESSES.donutEthLp as Address,
            ethPriceValue,
            donutUsd
          );
          if (lpPrice > 0) setLpPriceUsd(lpPrice);
        }
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [donutPriceInEth]);

  // Fetch franchise auction images
  useEffect(() => {
    franchiseAuctions.forEach((auction) => {
      if (auction.rigUri && !franchiseImages[auction.rigAddress]) {
        fetchRigMetadata(auction.rigUri).then((metadata) => {
          if (metadata?.image) {
            setFranchiseImages((prev) => ({
              ...prev,
              [auction.rigAddress]: ipfsToHttp(metadata.image as string),
            }));
          }
        });
      }
    });
  }, [franchiseAuctions, franchiseImages]);

  // Combine and sort all auctions
  const unifiedAuctions = useMemo(() => {
    const result: UnifiedAuction[] = [];

    // Add strategy auctions
    strategies.forEach((strategy) => {
      const paymentPrice = getPaymentTokenUsdPrice(strategy.paymentToken, ethPrice, donutPriceUsd, lpPriceUsd);
      const payUsd = Number(formatUnits(strategy.currentPrice, strategy.paymentTokenDecimals)) * paymentPrice;
      const getUsd = Number(formatUnits(strategy.revenueBalance, 18)) * ethPrice;
      const profitUsd = getUsd - payUsd;
      const profitPercent = payUsd > 0 ? (profitUsd / payUsd) * 100 : 0;

      const tokenLower = strategy.paymentToken.toLowerCase();
      const isLp = tokenLower === TOKEN_ADDRESSES.donutEthLp.toLowerCase();
      const acquireLink = isLp
        ? `https://app.uniswap.org/explore/pools/base/${strategy.paymentToken}`
        : `https://app.uniswap.org/explore/tokens/base/${strategy.paymentToken}?inputCurrency=NATIVE`;

      result.push({
        id: `strategy-${strategy.strategy}`,
        type: "strategy",
        name: getPaymentTokenSymbol(strategy.paymentToken),
        payUsd,
        getUsd,
        profitPercent,
        profitUsd,
        payAmount: strategy.currentPrice,
        payDecimals: strategy.paymentTokenDecimals,
        getAmount: strategy.revenueBalance,
        paymentToken: strategy.paymentToken,
        paymentSymbol: getPaymentTokenSymbol(strategy.paymentToken),
        hasSufficientBalance: strategy.accountPaymentTokenBalance >= strategy.currentPrice,
        balance: strategy.accountPaymentTokenBalance,
        acquireLink,
        strategyData: strategy,
      });
    });

    // Add franchise auctions
    franchiseAuctions.forEach((auction) => {
      const lpPriceInDonut = Number(formatUnits(auction.auctionState.price, 18)) *
        Number(formatUnits(auction.auctionState.paymentTokenPrice, 18));
      const payUsd = lpPriceInDonut * donutPriceUsd;
      const getUsd = Number(formatUnits(auction.auctionState.wethAccumulated, 18)) * ethPrice;
      const profitUsd = getUsd - payUsd;
      const profitPercent = payUsd > 0 ? (profitUsd / payUsd) * 100 : 0;

      result.push({
        id: `franchise-${auction.rigAddress}`,
        type: "franchise",
        name: auction.tokenSymbol || "???",
        payUsd,
        getUsd,
        profitPercent,
        profitUsd,
        payAmount: auction.auctionState.price,
        payDecimals: 18,
        getAmount: auction.auctionState.wethAccumulated,
        paymentToken: auction.auctionState.paymentToken,
        paymentSymbol: `${auction.tokenSymbol || "???"}-DONUT LP`,
        hasSufficientBalance: auction.auctionState.paymentTokenBalance >= auction.auctionState.price,
        balance: auction.auctionState.paymentTokenBalance,
        acquireLink: `https://app.uniswap.org/explore/pools/base/${auction.auctionState.paymentToken}`,
        imageUrl: franchiseImages[auction.rigAddress],
        franchiseData: auction,
      });
    });

    // Sort by profit percentage (highest first)
    return result.sort((a, b) => b.profitPercent - a.profitPercent);
  }, [strategies, franchiseAuctions, ethPrice, donutPriceUsd, lpPriceUsd, getPaymentTokenSymbol, franchiseImages]);

  // Pagination (1-indexed like franchise page)
  const page = currentPage + 1;
  const totalPages = Math.ceil(unifiedAuctions.length / ITEMS_PER_PAGE);
  const setPage = (p: number) => setCurrentPage(p - 1);
  const paginatedAuctions = unifiedAuctions.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  // Handle buy
  const handleBuy = useCallback(
    async (auction: UnifiedAuction) => {
      if (!userAddress) return;
      setActiveAuctionId(auction.id);

      if (auction.type === "strategy" && auction.strategyData) {
        const requiresApproval = needsApprovalForToken(auction.paymentToken, auction.payAmount);
        if (requiresApproval) {
          await strategyApproveAndBuy(auction.strategyData, auction.payAmount);
        } else {
          await handleBuyForStrategy(auction.strategyData, auction.payAmount);
        }
      } else if (auction.type === "franchise" && auction.franchiseData) {
        setSelectedFranchiseRig(auction.franchiseData.rigAddress);
        // Small delay to allow state to update
        setTimeout(() => {
          franchiseApproveAndBuy(auction.franchiseData!.auctionState.price);
        }, 100);
      }
    },
    [userAddress, needsApprovalForToken, strategyApproveAndBuy, handleBuyForStrategy, franchiseApproveAndBuy]
  );

  const isLoading = isLoadingStrategies || isLoadingFranchise;
  const globalBuyStep = activeAuctionId?.startsWith("franchise") ? franchiseBuyStep : strategyBuyStep;
  const globalBuyResult = activeAuctionId?.startsWith("franchise") ? franchiseBuyResult : strategyBuyResult;
  const globalIsBusy = strategyIsBusy || franchiseIsBusy;

  if (isLoading) {
    return (
      <div className="pt-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-32">
            <div className="text-zinc-600 text-xs font-mono">Loading auctions...</div>
          </div>
        </div>
      </div>
    );
  }

  if (unifiedAuctions.length === 0) {
    return (
      <div className="pt-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-32">
            <div className="text-zinc-600 text-xs font-mono">No auctions available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="max-w-4xl mx-auto px-3">
        {/* Header */}
        <div className="mb-3">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Auctions ({unifiedAuctions.length})
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              userAddress={userAddress}
              onBuy={() => handleBuy(auction)}
              isBusy={globalIsBusy}
              isActive={activeAuctionId === auction.id}
              buyStep={globalBuyStep}
              buyResult={globalBuyResult}
            />
          ))}
        </div>

        {/* Pagination - At bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 py-4">
            <Button
              variant="secondary"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="!p-2"
            >
              <ChevronLeft size={14} />
            </Button>

            {getPageNumbers().map((p, i) => (
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-corp-500 text-sm font-mono">...</span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? "primary" : "secondary"}
                  onClick={() => setPage(p)}
                  className="!min-w-[32px] !px-2 !py-1 !text-sm"
                >
                  {p}
                </Button>
              )
            ))}

            <Button
              variant="secondary"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="!p-2"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
