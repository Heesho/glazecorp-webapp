"use client";

import React, { useState, useMemo, useCallback } from "react";
import { formatUnits, formatEther, type Address } from "viem";
import { Lock, Unlock, RotateCcw, Clock } from "lucide-react";

import { Card, Button, DonutLogo } from "@/components/ui";
import { DONUT_DECIMALS } from "@/config/constants";
import { useStaking } from "../hooks/useStaking";
import { formatTimeUntilNextEpoch, canVoteThisEpoch, type VoterData } from "../hooks/useGovernData";

interface StakePanelProps {
  userAddress?: Address;
  voterData: VoterData | null;
  donutAllowance?: bigint;
  hasActiveVotes: boolean;
  canUnstake: boolean;
  onSuccess: () => void;
}

const formatTokenAmount = (value: bigint, decimals: number, maxFractionDigits = 2) => {
  if (value === 0n) return "0";
  const asNumber = Number(formatUnits(value, decimals));
  if (!Number.isFinite(asNumber)) return formatUnits(value, decimals);
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
};

export function StakePanel({
  userAddress,
  voterData,
  donutAllowance,
  hasActiveVotes,
  canUnstake,
  onSuccess,
}: StakePanelProps) {
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");

  const {
    txStep,
    txResult,
    isBusy,
    needsApproval,
    handleStake,
    handleApproveAndStake,
    handleUnstake,
    handleResetVotes,
  } = useStaking(userAddress, donutAllowance, onSuccess);

  const parsedAmount = useMemo(() => {
    try {
      if (!amount || amount === "") return 0n;
      const [whole, fraction = ""] = amount.split(".");
      const paddedFraction = fraction.padEnd(DONUT_DECIMALS, "0").slice(0, DONUT_DECIMALS);
      return BigInt(whole || "0") * 10n ** BigInt(DONUT_DECIMALS) + BigInt(paddedFraction);
    } catch {
      return 0n;
    }
  }, [amount]);

  const maxBalance =
    mode === "stake"
      ? voterData?.accountUnderlyingTokenBalance ?? 0n
      : voterData?.accountGovernanceTokenBalance ?? 0n;

  const insufficientBalance = parsedAmount > maxBalance;

  const setMaxAmount = useCallback(() => {
    if (!voterData) return;
    const balance =
      mode === "stake"
        ? voterData.accountUnderlyingTokenBalance
        : voterData.accountGovernanceTokenBalance;
    setAmount(formatEther(balance));
  }, [mode, voterData]);

  const canReset = voterData && canVoteThisEpoch(voterData.accountLastVoted);

  const handleAction = () => {
    if (mode === "stake") {
      if (needsApproval(amount)) {
        handleApproveAndStake(amount);
      } else {
        handleStake(amount);
      }
    } else {
      handleUnstake(amount);
    }
  };

  const getButtonText = () => {
    if (txResult === "success") return "SUCCESS!";
    if (txResult === "failure") return "FAILED";
    if (txStep === "approving") return "APPROVING...";
    if (txStep === "staking") return "STAKING...";
    if (txStep === "unstaking") return "UNSTAKING...";
    if (mode === "stake") return "STAKE";
    return "UNSTAKE";
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Stake/Unstake Toggle */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => {
            setMode("stake");
            setAmount("");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "stake"
              ? "bg-glaze-500 text-white"
              : "bg-corp-800 text-corp-400 hover:text-corp-50"
          }`}
        >
          <Lock size={14} />
          STAKE
        </button>
        <button
          onClick={() => {
            setMode("unstake");
            setAmount("");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === "unstake"
              ? "bg-glaze-500 text-white"
              : "bg-corp-800 text-corp-400 hover:text-corp-50"
          }`}
        >
          <Unlock size={14} />
          UNSTAKE
        </button>
      </div>

      {/* Amount Input */}
      <Card noPadding className="shrink-0">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {mode === "stake" ? "Stake" : "Unstake"}
            </span>
            <button
              onClick={setMaxAmount}
              className="text-[10px] font-mono text-glaze-400 hover:text-glaze-300"
            >
              {voterData
                ? formatTokenAmount(
                    mode === "stake"
                      ? voterData.accountUnderlyingTokenBalance
                      : voterData.accountGovernanceTokenBalance,
                    DONUT_DECIMALS
                  )
                : "0"}{" "}
              {mode === "stake" ? "DONUT" : "gDONUT"}
            </button>
          </div>
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded px-3 py-2">
            <DonutLogo className="w-6 h-6 shrink-0" />
            <input
              type="text"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setAmount(val);
              }}
              placeholder="0.00"
              className="flex-1 bg-transparent text-xl font-bold font-mono text-white placeholder:text-zinc-700 focus:outline-none"
            />
          </div>
          <div className="text-[9px] font-mono text-zinc-600 mt-1">1:1 exchange rate</div>
        </div>
      </Card>

      {insufficientBalance && parsedAmount > 0n && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-center shrink-0">
          <div className="text-[10px] text-red-400 font-mono">
            Insufficient {mode === "stake" ? "DONUT" : "gDONUT"} balance
          </div>
        </div>
      )}

      {/* Action Button */}
      {mode === "unstake" && hasActiveVotes ? (
        <Button
          variant="primary"
          fullWidth
          onClick={handleResetVotes}
          disabled={isBusy || !canReset}
          className="shrink-0 !py-3"
        >
          <RotateCcw size={14} className="mr-2" />
          {txStep === "resetting" ? "RESETTING..." : canReset ? "RESET" : `RESET IN ${voterData ? formatTimeUntilNextEpoch(voterData.accountLastVoted) : "-"}`}
        </Button>
      ) : (
        <Button
          variant="primary"
          fullWidth
          onClick={handleAction}
          disabled={isBusy || parsedAmount === 0n || insufficientBalance}
          className="shrink-0 !py-3"
        >
          {getButtonText()}
        </Button>
      )}
    </div>
  );
}
