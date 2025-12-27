"use client";

import { useCallback, useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";

import { LSG_ADDRESSES, LSG_MULTICALL_ABI } from "@/lib/blockchain/contracts";

export type FlushTxStep = "idle" | "flushing" | "confirming";

export function useFlushAndDistribute(userAddress?: Address, onSuccess?: () => void) {
  const [txStep, setTxStep] = useState<FlushTxStep>("idle");
  const [txResult, setTxResult] = useState<"success" | "failure" | null>(null);

  // Clear result after delay
  useEffect(() => {
    if (txResult) {
      const timeout = setTimeout(() => setTxResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [txResult]);

  const {
    data: flushTxHash,
    writeContract: writeFlush,
    isPending: isFlushPending,
    reset: resetFlush,
  } = useWriteContract();

  const { data: flushReceipt, isLoading: isFlushConfirming } = useWaitForTransactionReceipt({
    hash: flushTxHash,
    chainId: base.id,
  });

  // Handle completion
  useEffect(() => {
    if (flushReceipt?.status === "success") {
      setTxResult("success");
      setTxStep("idle");
      resetFlush();
      onSuccess?.();
    } else if (flushReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetFlush();
    }
  }, [flushReceipt, resetFlush, onSuccess]);

  const handleFlushAndDistribute = useCallback(async () => {
    if (!userAddress) return;
    setTxStep("flushing");
    try {
      await writeFlush({
        account: userAddress,
        address: LSG_ADDRESSES.lsgMulticall as Address,
        abi: LSG_MULTICALL_ABI,
        functionName: "flushAndDistributeAll",
        args: [],
        chainId: base.id,
      });
      setTxStep("confirming");
    } catch (error) {
      console.error("Flush failed:", error);
      setTxResult("failure");
      setTxStep("idle");
    }
  }, [userAddress, writeFlush]);

  const isBusy = txStep !== "idle" || isFlushPending || isFlushConfirming;

  return {
    txStep,
    txResult,
    isBusy,
    handleFlushAndDistribute,
  };
}
