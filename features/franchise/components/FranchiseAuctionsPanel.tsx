"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatUnits } from "viem";
import { ExternalLink } from "lucide-react";
import type { Address } from "viem";

import { Card, Button } from "@/components/ui";
import { useFranchiseAuctions, useFranchiseAuctionBuy, type FranchiseAuctionItem } from "../hooks/useFranchiseAuctions";
import { ipfsToHttp, fetchRigMetadata } from "@/lib/api/launchpad";

interface FranchiseAuctionsPanelProps {
  userAddress?: Address;
  ethPrice: number;
  donutPriceUsd: number;
}

const formatEth = (value: bigint, maxDecimals = 4) => {
  if (value === 0n) return "0";
  const num = Number(formatUnits(value, 18));
  if (num < 0.0001) return num.toFixed(6);
  return num.toFixed(maxDecimals);
};

// LP token icon - shows two overlapping tokens
function LpTokenIcon({ imageUrl, symbol }: { imageUrl?: string | null; symbol?: string }) {
  return (
    <div className="relative flex items-center">
      {/* Unit token (front) */}
      <div className="w-5 h-5 rounded-full bg-corp-800 flex items-center justify-center overflow-hidden z-[2]">
        {imageUrl ? (
          <img src={imageUrl} alt={symbol} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[8px] font-bold text-glaze-400">{symbol?.slice(0, 2) || "?"}</span>
        )}
      </div>
      {/* DONUT token (back) */}
      <div className="w-4 h-4 rounded-full bg-glaze-500 flex items-center justify-center -ml-2 z-[1]">
        <div className="w-1.5 h-1.5 rounded-full bg-black" />
      </div>
    </div>
  );
}

// WETH icon
function WethIcon({ className }: { className?: string }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center bg-[#627EEA] overflow-hidden ${className}`}>
      <svg viewBox="0 0 32 32" className="w-3 h-3" fill="none">
        <path d="M16 4L16 12.87L23 16.22L16 4Z" fill="white" fillOpacity="0.6" />
        <path d="M16 4L9 16.22L16 12.87L16 4Z" fill="white" />
        <path d="M16 21.97L16 28L23 17.62L16 21.97Z" fill="white" fillOpacity="0.6" />
        <path d="M16 28L16 21.97L9 17.62L16 28Z" fill="white" />
      </svg>
    </div>
  );
}

interface FranchiseAuctionCardProps {
  auction: FranchiseAuctionItem;
  userAddress?: Address;
  ethPrice: number;
  donutPriceUsd: number;
  isSelected: boolean;
  onClick: () => void;
}

function FranchiseAuctionCard({
  auction,
  userAddress,
  ethPrice,
  donutPriceUsd,
  isSelected,
  onClick,
}: FranchiseAuctionCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Fetch image from rig URI
  useEffect(() => {
    if (auction.rigUri) {
      fetchRigMetadata(auction.rigUri).then((metadata) => {
        if (metadata?.image) {
          setImageUrl(ipfsToHttp(metadata.image));
        }
      });
    }
  }, [auction.rigUri]);

  // LP price = price * paymentTokenPrice (in DONUT value)
  const lpPriceInDonut = Number(formatUnits(auction.auctionState.price, 18)) *
    Number(formatUnits(auction.auctionState.paymentTokenPrice, 18));
  const lpPriceUsd = lpPriceInDonut * donutPriceUsd;

  // WETH value
  const wethAmount = Number(formatUnits(auction.auctionState.wethAccumulated, 18));
  const wethUsd = wethAmount * ethPrice;

  // Profit calculation
  const difference = wethUsd - lpPriceUsd;
  const profitPercent = lpPriceUsd > 0 ? (difference / lpPriceUsd) * 100 : 0;

  const hasSufficientBalance = auction.auctionState.paymentTokenBalance >= auction.auctionState.price;

  return (
    <div
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-glaze-500" : "hover:ring-1 hover:ring-glaze-500/30"
      } rounded-lg`}
      onClick={onClick}
    >
      <Card noPadding>
        <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LpTokenIcon imageUrl={imageUrl} symbol={auction.tokenSymbol} />
            <span className="text-sm font-bold text-white">{auction.tokenSymbol || "???"}-DONUT LP</span>
          </div>
        </div>

        {/* Profitability */}
        <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded bg-black/30">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Profit</span>
          <span
            className={`text-sm font-bold font-mono ${
              difference >= 0 ? "text-glaze-400" : "text-red-400"
            }`}
          >
            {difference >= 0 ? "+" : ""}{profitPercent.toFixed(1)}% ({difference >= 0 ? "+" : ""}${Math.abs(difference).toFixed(2)})
          </span>
        </div>

        {/* PAY / GET Display */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* PAY */}
          <div className="bg-black/40 border border-white/10 rounded p-2">
            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">PAY</div>
            <div className="flex items-center gap-1.5">
              <LpTokenIcon imageUrl={imageUrl} symbol={auction.tokenSymbol} />
              <span className="text-sm font-bold font-mono text-white">
                {formatEth(auction.auctionState.price, 2)}
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">${lpPriceUsd.toFixed(2)}</div>
          </div>

          {/* GET */}
          <div className="bg-black/40 border border-white/10 rounded p-2">
            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">GET</div>
            <div className="flex items-center gap-1.5">
              <WethIcon />
              <span className="text-sm font-bold font-mono text-glaze-400">
                {formatEth(auction.auctionState.wethAccumulated, 5)}
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">${wethUsd.toFixed(2)}</div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
          <span>
            Bal: <span className={hasSufficientBalance ? "text-white" : "text-red-400"}>
              {formatEth(auction.auctionState.paymentTokenBalance, 2)}
            </span>
          </span>
          <a
            href={`https://app.uniswap.org/explore/pools/base/${auction.auctionState.paymentToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-glaze-400 hover:text-glaze-300"
            onClick={(e) => e.stopPropagation()}
          >
            Get LP
            <ExternalLink size={9} />
          </a>
        </div>
        </div>
      </Card>
    </div>
  );
}

export function FranchiseAuctionsPanel({
  userAddress,
  ethPrice,
  donutPriceUsd,
}: FranchiseAuctionsPanelProps) {
  const { auctions, isLoading, refetch } = useFranchiseAuctions(userAddress);
  const [selectedRig, setSelectedRig] = useState<Address | null>(null);

  const selectedAuction = auctions.find((a) => a.rigAddress === selectedRig);

  const { buyStep, buyResult, isBusy, handleApproveAndBuy } = useFranchiseAuctionBuy(
    selectedRig ?? undefined,
    userAddress,
    selectedAuction?.auctionState,
    refetch
  );

  // Auto-select first auction
  useEffect(() => {
    if (auctions.length > 0 && !selectedRig) {
      setSelectedRig(auctions[0].rigAddress);
    }
  }, [auctions, selectedRig]);

  const handleBuy = useCallback(() => {
    if (!selectedAuction) return;
    handleApproveAndBuy(selectedAuction.auctionState.price);
  }, [selectedAuction, handleApproveAndBuy]);

  const getButtonText = () => {
    if (buyResult === "success") return "SUCCESS!";
    if (buyResult === "failure") return "FAILED";
    if (buyStep === "approving") return "APPROVING...";
    if (buyStep === "buying") return "BUYING...";
    if (buyStep === "confirming") return "CONFIRMING...";
    if (!userAddress) return "CONNECT WALLET";
    return "BUY";
  };

  const canBuy =
    userAddress &&
    selectedAuction &&
    selectedAuction.auctionState.price > 0n &&
    selectedAuction.auctionState.paymentTokenBalance >= selectedAuction.auctionState.price;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-zinc-600 text-xs font-mono">Loading franchise auctions...</div>
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-zinc-600 text-xs font-mono">No franchise auctions available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
        Franchise Auctions
      </div>

      {/* Auction cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {auctions.map((auction) => (
          <FranchiseAuctionCard
            key={auction.rigAddress}
            auction={auction}
            userAddress={userAddress}
            ethPrice={ethPrice}
            donutPriceUsd={donutPriceUsd}
            isSelected={selectedRig === auction.rigAddress}
            onClick={() => setSelectedRig(auction.rigAddress)}
          />
        ))}
      </div>

      {/* Buy button for selected auction */}
      {selectedAuction && (
        <div className="mt-4">
          <Button
            variant="primary"
            fullWidth
            onClick={handleBuy}
            disabled={isBusy || !canBuy}
            className="!py-3"
          >
            {getButtonText()}
          </Button>
        </div>
      )}
    </div>
  );
}
