"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";

import { LAUNCHPAD_ADDRESSES, LAUNCHPAD_MULTICALL_ABI } from "@/lib/blockchain/contracts";
import type { RigState } from "./useRigState";

export type MineStep = "idle" | "mining" | "confirming";
export type MineResult = "success" | "failure" | null;

export function useMineRig(
  rigAddress?: Address,
  userAddress?: Address,
  rigState?: RigState | null,
  onSuccess?: () => void
) {
  const [mineStep, setMineStep] = useState<MineStep>("idle");
  const [mineResult, setMineResult] = useState<MineResult>(null);

  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleMine = useCallback(
    async (uri: string = "") => {
      if (!rigAddress || !userAddress || !rigState) return;

      setMineStep("mining");
      setMineResult(null);

      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
        const maxPrice = (rigState.price * 105n) / 100n; // 5% slippage

        writeContract(
          {
            address: LAUNCHPAD_ADDRESSES.multicall as Address,
            abi: LAUNCHPAD_MULTICALL_ABI,
            functionName: "mine",
            args: [rigAddress, rigState.epochId, deadline, maxPrice, uri],
            value: rigState.price,
            chainId: base.id,
          },
          {
            onSuccess: () => {
              setMineStep("confirming");
            },
            onError: (error) => {
              console.error("Mine error:", error);
              setMineStep("idle");
              setMineResult("failure");
              setTimeout(() => setMineResult(null), 3000);
            },
          }
        );
      } catch (error) {
        console.error("Mine error:", error);
        setMineStep("idle");
        setMineResult("failure");
        setTimeout(() => setMineResult(null), 3000);
      }
    },
    [rigAddress, userAddress, rigState, writeContract]
  );

  // Watch for confirmation
  if (isSuccess && mineStep === "confirming") {
    setMineStep("idle");
    setMineResult("success");
    onSuccess?.();
    setTimeout(() => setMineResult(null), 3000);
  }

  const isBusy = mineStep !== "idle" || isWritePending || isConfirming;

  return {
    mineStep,
    mineResult,
    isBusy,
    handleMine,
  };
}
