"use client";

import { useCallback, useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { type Address } from "viem";

import { LSG_ADDRESSES, VOTER_ABI } from "@/lib/blockchain/contracts";

export type VoteTxStep = "idle" | "voting" | "resetting" | "claiming";

export function useVoting(userAddress?: Address, onSuccess?: () => void) {
  const [txStep, setTxStep] = useState<VoteTxStep>("idle");
  const [txResult, setTxResult] = useState<"success" | "failure" | null>(null);
  const [voteWeights, setVoteWeights] = useState<Record<string, number>>({});

  // Clear result after delay
  useEffect(() => {
    if (txResult) {
      const timeout = setTimeout(() => setTxResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [txResult]);

  // Write contract hooks
  const {
    data: voteTxHash,
    writeContract: writeVote,
    isPending: isVotePending,
    reset: resetVote,
  } = useWriteContract();

  const {
    data: resetTxHash,
    writeContract: writeReset,
    isPending: isResetPending,
    reset: resetResetTx,
  } = useWriteContract();

  const {
    data: claimTxHash,
    writeContract: writeClaim,
    isPending: isClaimPending,
    reset: resetClaim,
  } = useWriteContract();

  // Wait for receipts
  const { data: voteReceipt, isLoading: isVoteConfirming } = useWaitForTransactionReceipt({
    hash: voteTxHash,
    chainId: base.id,
  });

  const { data: resetReceipt, isLoading: isResetConfirming } = useWaitForTransactionReceipt({
    hash: resetTxHash,
    chainId: base.id,
  });

  const { data: claimReceipt, isLoading: isClaimConfirming } = useWaitForTransactionReceipt({
    hash: claimTxHash,
    chainId: base.id,
  });

  // Handle vote completion
  useEffect(() => {
    if (voteReceipt?.status === "success") {
      setTxResult("success");
      setVoteWeights({});
      setTxStep("idle");
      resetVote();
      onSuccess?.();
    } else if (voteReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetVote();
    }
  }, [voteReceipt, resetVote, onSuccess]);

  // Handle reset completion
  useEffect(() => {
    if (resetReceipt?.status === "success") {
      setTxResult("success");
      setTxStep("idle");
      resetResetTx();
      onSuccess?.();
    } else if (resetReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetResetTx();
    }
  }, [resetReceipt, resetResetTx, onSuccess]);

  // Handle claim completion
  useEffect(() => {
    if (claimReceipt?.status === "success") {
      setTxResult("success");
      setTxStep("idle");
      resetClaim();
      onSuccess?.();
    } else if (claimReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetClaim();
    }
  }, [claimReceipt, resetClaim, onSuccess]);

  // Total weight of vote inputs
  const totalVoteWeight = Object.values(voteWeights).reduce((sum, w) => sum + w, 0);

  // Handle vote
  const handleVote = useCallback(async () => {
    if (!userAddress || totalVoteWeight === 0) return;
    setTxStep("voting");
    try {
      const strategies = Object.keys(voteWeights).filter((s) => voteWeights[s] > 0) as Address[];
      const weights = strategies.map((s) => BigInt(voteWeights[s]));

      await writeVote({
        account: userAddress,
        address: LSG_ADDRESSES.voter as Address,
        abi: VOTER_ABI,
        functionName: "vote",
        args: [strategies, weights],
        chainId: base.id,
      });
    } catch (error) {
      console.error("Vote failed:", error);
      setTxResult("failure");
      setTxStep("idle");
    }
  }, [userAddress, totalVoteWeight, voteWeights, writeVote]);

  // Handle reset
  const handleReset = useCallback(async () => {
    if (!userAddress) return;
    setTxStep("resetting");
    try {
      await writeReset({
        account: userAddress,
        address: LSG_ADDRESSES.voter as Address,
        abi: VOTER_ABI,
        functionName: "reset",
        args: [],
        chainId: base.id,
      });
    } catch (error) {
      console.error("Reset failed:", error);
      setTxResult("failure");
      setTxStep("idle");
    }
  }, [userAddress, writeReset]);

  // Handle claim bribes
  const handleClaimBribes = useCallback(
    async (bribeAddresses: Address[]) => {
      if (!userAddress || !bribeAddresses.length) return;
      setTxStep("claiming");
      try {
        await writeClaim({
          account: userAddress,
          address: LSG_ADDRESSES.voter as Address,
          abi: VOTER_ABI,
          functionName: "claimBribes",
          args: [bribeAddresses],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Claim failed:", error);
        setTxResult("failure");
        setTxStep("idle");
      }
    },
    [userAddress, writeClaim]
  );

  const isBusy =
    txStep !== "idle" ||
    isVotePending ||
    isResetPending ||
    isClaimPending ||
    isVoteConfirming ||
    isResetConfirming ||
    isClaimConfirming;

  return {
    txStep,
    txResult,
    isBusy,
    voteWeights,
    setVoteWeights,
    totalVoteWeight,
    handleVote,
    handleReset,
    handleClaimBribes,
  };
}
