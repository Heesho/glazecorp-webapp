"use client";

import { useCallback, useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { parseUnits, type Address } from "viem";

import {
  LSG_ADDRESSES,
  TOKEN_ADDRESSES,
  GOVERNANCE_TOKEN_ABI,
  ERC20_ABI,
  VOTER_ABI,
} from "@/lib/blockchain/contracts";
import { DONUT_DECIMALS } from "@/config/constants";

export type TxStep = "idle" | "approving" | "staking" | "unstaking" | "delegating" | "resetting";

export function useStaking(
  userAddress?: Address,
  donutAllowance?: bigint,
  onSuccess?: () => void
) {
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txResult, setTxResult] = useState<"success" | "failure" | null>(null);
  const [pendingStake, setPendingStake] = useState<string | null>(null);

  // Clear result after delay
  useEffect(() => {
    if (txResult) {
      const timeout = setTimeout(() => setTxResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [txResult]);

  // Write contract hooks
  const {
    data: approveTxHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useWriteContract();

  const {
    data: stakeTxHash,
    writeContract: writeStake,
    isPending: isStakePending,
    reset: resetStake,
  } = useWriteContract();

  const {
    data: delegateTxHash,
    writeContract: writeDelegate,
    isPending: isDelegatePending,
    reset: resetDelegateTx,
  } = useWriteContract();

  const {
    data: resetVotesTxHash,
    writeContract: writeResetVotes,
    isPending: isResetVotesPending,
    reset: resetResetVotesTx,
  } = useWriteContract();

  // Wait for receipts
  const { data: approveReceipt, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId: base.id,
  });

  const { data: stakeReceipt, isLoading: isStakeConfirming } = useWaitForTransactionReceipt({
    hash: stakeTxHash,
    chainId: base.id,
  });

  const { data: delegateReceipt, isLoading: isDelegateConfirming } = useWaitForTransactionReceipt({
    hash: delegateTxHash,
    chainId: base.id,
  });

  const { data: resetVotesReceipt, isLoading: isResetVotesConfirming } = useWaitForTransactionReceipt({
    hash: resetVotesTxHash,
    chainId: base.id,
  });

  // Handle tx completions
  useEffect(() => {
    if (approveReceipt?.status === "success") {
      resetApprove();
      onSuccess?.();
      // If there's a pending stake, trigger it
      if (pendingStake) {
        setTxStep("staking");
        const amount = pendingStake;
        setPendingStake(null);
        const parsedAmount = parseUnits(amount, DONUT_DECIMALS);
        try {
          writeStake({
            account: userAddress!,
            address: LSG_ADDRESSES.governanceToken as Address,
            abi: GOVERNANCE_TOKEN_ABI,
            functionName: "stake",
            args: [parsedAmount],
            chainId: base.id,
          });
        } catch {
          setTxResult("failure");
          setTxStep("idle");
        }
      } else {
        setTxStep("idle");
      }
    } else if (approveReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      setPendingStake(null);
      resetApprove();
    }
  }, [approveReceipt, resetApprove, onSuccess, pendingStake, userAddress, writeStake]);

  useEffect(() => {
    if (stakeReceipt?.status === "success") {
      setTxResult("success");
      setTxStep("idle");
      resetStake();
      onSuccess?.();
    } else if (stakeReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetStake();
    }
  }, [stakeReceipt, resetStake, onSuccess]);

  useEffect(() => {
    if (delegateReceipt?.status === "success") {
      setTxResult("success");
      setTxStep("idle");
      resetDelegateTx();
      onSuccess?.();
    } else if (delegateReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetDelegateTx();
    }
  }, [delegateReceipt, resetDelegateTx, onSuccess]);

  useEffect(() => {
    if (resetVotesReceipt?.status === "success") {
      setTxResult("success");
      setTxStep("idle");
      resetResetVotesTx();
      onSuccess?.();
    } else if (resetVotesReceipt?.status === "reverted") {
      setTxResult("failure");
      setTxStep("idle");
      resetResetVotesTx();
    }
  }, [resetVotesReceipt, resetResetVotesTx, onSuccess]);

  // Check if needs approval
  const needsApproval = useCallback(
    (amount: string) => {
      if (!amount) return false;
      try {
        const parsedAmount = parseUnits(amount, DONUT_DECIMALS);
        if (parsedAmount === 0n) return false;
        // If no allowance or allowance is less than amount, needs approval
        const currentAllowance = donutAllowance ?? 0n;
        return currentAllowance < parsedAmount;
      } catch {
        return false;
      }
    },
    [donutAllowance]
  );

  // Handle approve
  const handleApprove = useCallback(
    async (amount: string) => {
      if (!userAddress || !amount) return;
      setTxStep("approving");
      try {
        const parsedAmount = parseUnits(amount, DONUT_DECIMALS);
        await writeApprove({
          account: userAddress,
          address: TOKEN_ADDRESSES.donut as Address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [LSG_ADDRESSES.governanceToken as Address, parsedAmount],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Approve failed:", error);
        setTxResult("failure");
        setTxStep("idle");
      }
    },
    [userAddress, writeApprove]
  );

  // Handle stake
  const handleStake = useCallback(
    async (amount: string) => {
      if (!userAddress || !amount) return;
      setTxStep("staking");
      try {
        const parsedAmount = parseUnits(amount, DONUT_DECIMALS);
        await writeStake({
          account: userAddress,
          address: LSG_ADDRESSES.governanceToken as Address,
          abi: GOVERNANCE_TOKEN_ABI,
          functionName: "stake",
          args: [parsedAmount],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Stake failed:", error);
        setTxResult("failure");
        setTxStep("idle");
      }
    },
    [userAddress, writeStake]
  );

  // Handle approve and stake in sequence
  const handleApproveAndStake = useCallback(
    async (amount: string) => {
      if (!userAddress || !amount) return;
      setPendingStake(amount);
      setTxStep("approving");
      try {
        const parsedAmount = parseUnits(amount, DONUT_DECIMALS);
        await writeApprove({
          account: userAddress,
          address: TOKEN_ADDRESSES.donut as Address,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [LSG_ADDRESSES.governanceToken as Address, parsedAmount],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Approve failed:", error);
        setTxResult("failure");
        setTxStep("idle");
        setPendingStake(null);
      }
    },
    [userAddress, writeApprove]
  );

  // Handle unstake
  const handleUnstake = useCallback(
    async (amount: string) => {
      if (!userAddress || !amount) return;
      setTxStep("unstaking");
      try {
        const parsedAmount = parseUnits(amount, DONUT_DECIMALS);
        await writeStake({
          account: userAddress,
          address: LSG_ADDRESSES.governanceToken as Address,
          abi: GOVERNANCE_TOKEN_ABI,
          functionName: "unstake",
          args: [parsedAmount],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Unstake failed:", error);
        setTxResult("failure");
        setTxStep("idle");
      }
    },
    [userAddress, writeStake]
  );

  // Handle delegate
  const handleDelegate = useCallback(
    async (delegatee: Address) => {
      if (!userAddress) return;
      setTxStep("delegating");
      try {
        await writeDelegate({
          account: userAddress,
          address: LSG_ADDRESSES.governanceToken as Address,
          abi: GOVERNANCE_TOKEN_ABI,
          functionName: "delegate",
          args: [delegatee],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Delegate failed:", error);
        setTxResult("failure");
        setTxStep("idle");
      }
    },
    [userAddress, writeDelegate]
  );

  // Handle reset votes
  const handleResetVotes = useCallback(async () => {
    if (!userAddress) return;
    setTxStep("resetting");
    try {
      await writeResetVotes({
        account: userAddress,
        address: LSG_ADDRESSES.voter as Address,
        abi: VOTER_ABI,
        functionName: "reset",
        args: [],
        chainId: base.id,
      });
    } catch (error) {
      console.error("Reset votes failed:", error);
      setTxResult("failure");
      setTxStep("idle");
    }
  }, [userAddress, writeResetVotes]);

  const isBusy =
    txStep !== "idle" ||
    isApprovePending ||
    isStakePending ||
    isDelegatePending ||
    isResetVotesPending ||
    isApproveConfirming ||
    isStakeConfirming ||
    isDelegateConfirming ||
    isResetVotesConfirming;

  return {
    txStep,
    txResult,
    isBusy,
    needsApproval,
    handleApprove,
    handleStake,
    handleApproveAndStake,
    handleUnstake,
    handleDelegate,
    handleResetVotes,
  };
}
