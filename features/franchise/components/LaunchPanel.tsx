"use client";

import React, { useState } from "react";
import { formatUnits } from "viem";
import { Rocket, Upload, Check, AlertCircle } from "lucide-react";
import type { Address } from "viem";

import { Card, Button, DonutLogo } from "@/components/ui";
import { useLaunchRig, type LaunchParams } from "../hooks/useLaunchRig";
import { LAUNCH_DEFAULTS } from "@/lib/blockchain/contracts";
import { DONUT_DECIMALS } from "@/config/constants";

interface LaunchPanelProps {
  userAddress?: Address;
  onSuccess?: () => void;
}

const formatDonut = (value: bigint) => {
  const num = Number(formatUnits(value, DONUT_DECIMALS));
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

export function LaunchPanel({ userAddress, onSuccess }: LaunchPanelProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");

  const {
    step,
    result,
    isBusy,
    donutBalance,
    needsApproval,
    hasSufficientBalance,
    handleApprove,
    handleLaunch,
  } = useLaunchRig(userAddress, onSuccess);

  const isFormValid = name.trim().length >= 2 && symbol.trim().length >= 2;
  const canLaunch = isFormValid && hasSufficientBalance() && userAddress;

  const handleSubmit = async () => {
    if (!canLaunch) return;

    // For now, create a simple metadata JSON and use it directly
    // In production, you'd upload to IPFS first
    const metadata: LaunchParams = {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      uri: `data:application/json,${encodeURIComponent(JSON.stringify({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
      }))}`,
    };

    if (needsApproval()) {
      await handleApprove();
    } else {
      await handleLaunch(metadata);
    }
  };

  const getButtonText = () => {
    if (result === "success") return "SUCCESS!";
    if (result === "failure") return "FAILED";
    if (step === "approving") return "APPROVING...";
    if (step === "launching") return "LAUNCHING...";
    if (!userAddress) return "CONNECT WALLET";
    if (!hasSufficientBalance()) return "INSUFFICIENT DONUT";
    if (needsApproval()) return "APPROVE DONUT";
    return "LAUNCH RIG";
  };

  const launchCost = LAUNCH_DEFAULTS.launchDonut;

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Cost Info */}
      <Card size="sm" className="shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-corp-400 mb-1">Launch Cost</div>
            <div className="flex items-center gap-2">
              <DonutLogo className="w-5 h-5" />
              <span className="text-xl font-bold text-glaze-400">
                {formatDonut(launchCost)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-corp-400 mb-1">Your Balance</div>
            <div className="flex items-center gap-2 justify-end">
              <DonutLogo className="w-4 h-4" />
              <span className={`text-lg font-bold ${
                hasSufficientBalance() ? "text-emerald-400" : "text-red-400"
              }`}>
                {donutBalance ? formatDonut(donutBalance) : "0"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Form */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3">
        {/* Token Name */}
        <Card size="sm">
          <label className="text-xs text-corp-400 mb-2 block">Token Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Super Rig"
            maxLength={32}
            className="w-full bg-corp-950/60 border border-corp-700 rounded-lg px-3 py-2.5 text-sm text-corp-50 placeholder:text-corp-600 focus:outline-none focus:border-glaze-500/50 transition-colors"
          />
        </Card>

        {/* Token Symbol */}
        <Card size="sm">
          <label className="text-xs text-corp-400 mb-2 block">Token Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. SRIG"
            maxLength={8}
            className="w-full bg-corp-950/60 border border-corp-700 rounded-lg px-3 py-2.5 text-sm text-corp-50 placeholder:text-corp-600 focus:outline-none focus:border-glaze-500/50 uppercase transition-colors"
          />
        </Card>

        {/* Description */}
        <Card size="sm">
          <label className="text-xs text-corp-400 mb-2 block">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your rig..."
            maxLength={200}
            rows={3}
            className="w-full bg-corp-950/60 border border-corp-700 rounded-lg px-3 py-2.5 text-sm text-corp-50 placeholder:text-corp-600 focus:outline-none focus:border-glaze-500/50 resize-none transition-colors"
          />
        </Card>

        {/* Launch Parameters Info */}
        <Card size="sm" className="bg-corp-800/30">
          <div className="space-y-2">
            <div className="text-xs text-corp-400">Launch Parameters</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-corp-500">Rig Epoch:</span>
                <span className="text-corp-200 font-medium">1 hour</span>
              </div>
              <div className="flex justify-between">
                <span className="text-corp-500">Rig Multiplier:</span>
                <span className="text-corp-200 font-medium">2x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-corp-500">Auction Epoch:</span>
                <span className="text-corp-200 font-medium">24 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-corp-500">Auction Mult:</span>
                <span className="text-corp-200 font-medium">1.2x</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Launch Button */}
      <Button
        variant="primary"
        fullWidth
        onClick={handleSubmit}
        disabled={isBusy || !canLaunch}
        className={`shrink-0 h-11 !font-semibold ${
          result === "success"
            ? "!bg-emerald-500"
            : result === "failure"
            ? "!bg-red-500"
            : ""
        }`}
      >
        <Rocket size={16} className="mr-2" />
        {getButtonText()}
      </Button>

      {!hasSufficientBalance() && userAddress && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center shrink-0">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span className="text-xs text-red-400">
            You need {formatDonut(launchCost)} DONUT to launch a rig
          </span>
        </div>
      )}
    </div>
  );
}
