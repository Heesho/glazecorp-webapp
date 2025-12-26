"use client";

import React, { useState, useMemo, useEffect } from "react";
import { formatUnits } from "viem";
import {
  Hammer,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  Zap,
  Wallet,
  ArrowUpDown,
} from "lucide-react";
import type { Address } from "viem";

import { Card, Button, DonutLogo } from "@/components/ui";
import { PriceChart } from "./PriceChart";
import { useRigState } from "../hooks/useRigState";
import { useMineRig } from "../hooks/useMineRig";
import { useSwapRig } from "../hooks/useSwapRig";
import type { SubgraphRig } from "@/lib/api/launchpad";

type TabType = "mine" | "swap" | "chart";

interface RigDetailPanelProps {
  rig: SubgraphRig | null;
  userAddress?: Address;
}

const formatEth = (value: bigint, decimals = 18) => {
  const num = Number(formatUnits(value, decimals));
  return num.toFixed(5);
};

const formatToken = (value: bigint) => {
  const num = Number(formatUnits(value, 18));
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

export function RigDetailPanel({ rig, userAddress }: RigDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("mine");
  const [mineMessage, setMineMessage] = useState("");

  const rigAddress = rig?.id as Address | undefined;
  const { rigState, rigInfo, refetch, isLoading, error } = useRigState(rig);

  const { mineStep, mineResult, isBusy: isMining, handleMine } = useMineRig(
    rigAddress,
    userAddress,
    rigState,
    refetch
  );

  const {
    swapStep,
    swapResult,
    isBusy: isSwapping,
    direction,
    setDirection,
    inputAmount,
    setInputAmount,
    outputAmount,
    needsApproval,
    handleApprove,
    handleSwap,
  } = useSwapRig(rigInfo, userAddress, refetch);

  // Mock price history for chart (would be fetched from DexScreener in production)
  const priceHistory = useMemo(() => {
    if (!rigState) return [];
    const now = Math.floor(Date.now() / 1000);
    const points = [];
    const basePrice = Number(formatUnits(rigState.price, 18));
    for (let i = 24; i >= 0; i--) {
      const time = now - i * 3600;
      const variance = (Math.random() - 0.5) * 0.2 * basePrice;
      points.push({ time, value: Math.max(0.00001, basePrice + variance) });
    }
    return points;
  }, [rigState?.price]);

  // Time until next epoch
  const timeUntilEpoch = useMemo(() => {
    if (!rigState) return "-";
    const now = BigInt(Math.floor(Date.now() / 1000));
    const elapsed = now - rigState.epochStartTime;
    const epochDuration = 3600n; // 1 hour default
    const remaining = epochDuration - (elapsed % epochDuration);
    const minutes = Number(remaining / 60n);
    const seconds = Number(remaining % 60n);
    return `${minutes}m ${seconds}s`;
  }, [rigState]);

  if (!rig) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600">
        <Hammer size={48} className="mb-4 opacity-50" />
        <div className="text-sm font-mono">Select a rig to view details</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-600 text-xs font-mono">Loading rig data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 p-4">
        <div className="text-xs font-mono">Error loading rig data</div>
        <div className="text-[10px] font-mono text-zinc-500 text-center break-all">
          {error.message}
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "mine", label: "MINE", icon: <Hammer size={12} /> },
    { id: "swap", label: "SWAP", icon: <ArrowLeftRight size={12} /> },
    { id: "chart", label: "CHART", icon: <TrendingUp size={12} /> },
  ];

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Rig Header */}
      <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded border border-zinc-800 shrink-0">
        <div className="w-10 h-10 rounded bg-glaze-500/20 border border-glaze-500/30 flex items-center justify-center">
          <span className="text-glaze-400 font-bold text-sm">
            {rig.symbol?.slice(0, 2) || "?"}
          </span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">{rig.name}</div>
          <div className="text-[10px] font-mono text-zinc-500">${rig.symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-emerald-400 font-mono">
            Ξ{rigState ? formatEth(rigState.price) : "-"}
          </div>
          <div className="text-[9px] text-zinc-600 font-mono">current price</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded border border-zinc-800 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono font-bold rounded transition-all ${
              activeTab === tab.id
                ? "bg-glaze-500 text-white"
                : "text-zinc-500 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "mine" && (
          <MineTab
            rigState={rigState}
            rigInfo={rigInfo}
            timeUntilEpoch={timeUntilEpoch}
            mineMessage={mineMessage}
            setMineMessage={setMineMessage}
            mineStep={mineStep}
            mineResult={mineResult}
            isMining={isMining}
            handleMine={handleMine}
            userAddress={userAddress}
          />
        )}

        {activeTab === "swap" && (
          <SwapTab
            rigState={rigState}
            rigInfo={rigInfo}
            direction={direction}
            setDirection={setDirection}
            inputAmount={inputAmount}
            setInputAmount={setInputAmount}
            outputAmount={outputAmount}
            swapStep={swapStep}
            swapResult={swapResult}
            isSwapping={isSwapping}
            needsApproval={needsApproval}
            handleApprove={handleApprove}
            handleSwap={handleSwap}
            userAddress={userAddress}
          />
        )}

        {activeTab === "chart" && (
          <ChartTab priceHistory={priceHistory} rigInfo={rigInfo} rigState={rigState} />
        )}
      </div>
    </div>
  );
}

// Mine Tab Component
function MineTab({
  rigState,
  rigInfo,
  timeUntilEpoch,
  mineMessage,
  setMineMessage,
  mineStep,
  mineResult,
  isMining,
  handleMine,
  userAddress,
}: any) {
  const getButtonText = () => {
    if (mineResult === "success") return "SUCCESS!";
    if (mineResult === "failure") return "FAILED";
    if (mineStep === "mining") return "MINING...";
    if (mineStep === "confirming") return "CONFIRMING...";
    if (!userAddress) return "CONNECT WALLET";
    return "MINE";
  };

  const canMine = userAddress && rigState && rigState.ethBalance >= rigState.price;

  return (
    <div className="flex flex-col gap-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card noPadding>
          <div className="p-3">
            <div className="flex items-center gap-1 mb-1">
              <Zap size={10} className="text-yellow-400" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                Glaze Rate
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-yellow-400">
              {rigState ? formatToken(rigState.ups) : "-"}/s
            </div>
          </div>
        </Card>
        <Card noPadding>
          <div className="p-3">
            <div className="flex items-center gap-1 mb-1">
              <Clock size={10} className="text-blue-400" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                Next Epoch
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-blue-400">{timeUntilEpoch}</div>
          </div>
        </Card>
      </div>

      {/* Current Miner */}
      {rigState?.miner && rigState.miner !== "0x0000000000000000000000000000000000000000" && (
        <Card noPadding>
          <div className="p-3">
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
              Current Miner
            </div>
            <div className="text-xs font-mono text-white truncate">{rigState.miner}</div>
            {rigState.epochUri && (
              <div className="text-[10px] font-mono text-zinc-400 mt-1 truncate">
                "{rigState.epochUri}"
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Balances */}
      <Card noPadding>
        <div className="p-3">
          <div className="flex items-center gap-1 mb-2">
            <Wallet size={10} className="text-glaze-400" />
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              Your Balances
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-500">ETH:</span>
              <span className="text-white ml-1">
                Ξ{rigState ? formatEth(rigState.ethBalance) : "0"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">{rigInfo?.tokenSymbol || "Token"}:</span>
              <span className="text-white ml-1">
                {rigState ? formatToken(rigState.unitBalance) : "0"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Mine Message Input */}
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded px-3 py-2">
        <span className="text-glaze-400 font-mono text-sm">_</span>
        <input
          type="text"
          value={mineMessage}
          onChange={(e) => setMineMessage(e.target.value)}
          placeholder="Enter message (optional)"
          className="flex-1 bg-transparent text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none"
          maxLength={200}
        />
      </div>

      {/* Mine Button */}
      <Button
        variant="primary"
        fullWidth
        onClick={() => handleMine(mineMessage)}
        disabled={isMining || !canMine}
        className={`!py-3 ${
          mineResult === "success"
            ? "!bg-emerald-500"
            : mineResult === "failure"
            ? "!bg-red-500"
            : ""
        }`}
      >
        <Hammer size={16} className="mr-2" />
        {getButtonText()}
        {rigState && (
          <span className="ml-2 opacity-75">Ξ{formatEth(rigState.price)}</span>
        )}
      </Button>
    </div>
  );
}

// Swap Tab Component
function SwapTab({
  rigState,
  rigInfo,
  direction,
  setDirection,
  inputAmount,
  setInputAmount,
  outputAmount,
  swapStep,
  swapResult,
  isSwapping,
  needsApproval,
  handleApprove,
  handleSwap,
  userAddress,
}: any) {
  const getButtonText = () => {
    if (swapResult === "success") return "SUCCESS!";
    if (swapResult === "failure") return "FAILED";
    if (swapStep === "approving") return "APPROVING...";
    if (swapStep === "swapping") return "SWAPPING...";
    if (swapStep === "confirming") return "CONFIRMING...";
    if (!userAddress) return "CONNECT WALLET";
    if (needsApproval) return "APPROVE";
    return "SWAP";
  };

  const canSwap = userAddress && inputAmount && parseFloat(inputAmount) > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Direction Toggle */}
      <div className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded border border-zinc-800">
        <button
          onClick={() => setDirection("buy")}
          className={`flex-1 py-2 text-[10px] font-mono font-bold rounded transition-all ${
            direction === "buy"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          BUY {rigInfo?.tokenSymbol || "TOKEN"}
        </button>
        <button
          onClick={() => setDirection("sell")}
          className={`flex-1 py-2 text-[10px] font-mono font-bold rounded transition-all ${
            direction === "sell"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          SELL {rigInfo?.tokenSymbol || "TOKEN"}
        </button>
      </div>

      {/* Input */}
      <Card noPadding>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              {direction === "buy" ? "You Pay" : "You Sell"}
            </span>
            <span className="text-[9px] font-mono text-zinc-600">
              Balance:{" "}
              {direction === "buy"
                ? rigState ? formatEth(rigState.ethBalance) : "0"
                : rigState ? formatToken(rigState.unitBalance) : "0"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setInputAmount(val);
              }}
              placeholder="0.00"
              className="flex-1 bg-transparent text-xl font-bold font-mono text-white placeholder:text-zinc-700 focus:outline-none"
            />
            <span className="text-sm font-mono text-zinc-500">
              {direction === "buy" ? "ETH" : rigInfo?.tokenSymbol || "TOKEN"}
            </span>
          </div>
        </div>
      </Card>

      {/* Arrow */}
      <div className="flex justify-center">
        <div className="p-2 bg-zinc-800 rounded-full border border-zinc-700">
          <ArrowUpDown size={14} className="text-zinc-500" />
        </div>
      </div>

      {/* Output */}
      <Card noPadding>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              You Receive
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-xl font-bold font-mono text-emerald-400">
              {outputAmount || "0.00"}
            </div>
            <span className="text-sm font-mono text-zinc-500">
              {direction === "buy" ? rigInfo?.tokenSymbol || "TOKEN" : "ETH"}
            </span>
          </div>
        </div>
      </Card>

      {/* Swap Button */}
      <Button
        variant="primary"
        fullWidth
        onClick={needsApproval ? handleApprove : handleSwap}
        disabled={isSwapping || !canSwap}
        className={`!py-3 ${
          swapResult === "success"
            ? "!bg-emerald-500"
            : swapResult === "failure"
            ? "!bg-red-500"
            : ""
        }`}
      >
        <ArrowLeftRight size={16} className="mr-2" />
        {getButtonText()}
      </Button>
    </div>
  );
}

// Chart Tab Component
function ChartTab({ priceHistory, rigInfo, rigState }: any) {
  return (
    <div className="flex flex-col gap-3">
      {/* Price Info */}
      <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800">
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
          {rigInfo?.tokenSymbol || "Token"} Price
        </div>
        <div className="text-2xl font-bold font-mono text-white">
          Ξ{rigState ? formatEth(rigState.price) : "-"}
        </div>
      </div>

      {/* Chart */}
      <Card noPadding>
        <div className="p-3">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
            Price History (24h)
          </div>
          <PriceChart data={priceHistory} height={180} />
        </div>
      </Card>

      {/* Token Stats */}
      <Card noPadding>
        <div className="p-3">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
            Token Info
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-500">DONUT:</span>
              <span className="text-white ml-1">
                {rigState ? formatToken(rigState.donutBalance) : "0"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Unit Balance:</span>
              <span className="text-white ml-1">
                {rigState ? formatToken(rigState.unitBalance) : "0"}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
