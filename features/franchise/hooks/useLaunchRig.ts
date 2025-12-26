"use client";

import { useState, useCallback, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { type Address, parseUnits } from "viem";

import {
  LAUNCHPAD_ADDRESSES,
  LAUNCHPAD_MULTICALL_ABI,
  TOKEN_ADDRESSES,
  ERC20_ABI,
  LAUNCH_DEFAULTS,
} from "@/lib/blockchain/contracts";
import { DONUT_DECIMALS } from "@/config/constants";

export type LaunchStep = "idle" | "approving" | "launching";

export interface LaunchParams {
  name: string;
  symbol: string;
  uri: string; // IPFS URI for metadata
}

export function useLaunchRig(userAddress?: Address, onSuccess?: () => void) {
  const [step, setStep] = useState<LaunchStep>("idle");
  const [result, setResult] = useState<"success" | "failure" | null>(null);

  // Clear result after delay
  useEffect(() => {
    if (result) {
      const timeout = setTimeout(() => setResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [result]);

  // Get user's DONUT balance
  const { data: donutBalance, refetch: refetchBalance } = useReadContract({
    address: TOKEN_ADDRESSES.donut as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress ?? "0x0000000000000000000000000000000000000000"],
    chainId: base.id,
    query: { enabled: !!userAddress },
  });

  // Get user's DONUT allowance for launchpad
  const { data: donutAllowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESSES.donut as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [
      userAddress ?? "0x0000000000000000000000000000000000000000",
      LAUNCHPAD_ADDRESSES.multicall as Address,
    ],
    chainId: base.id,
    query: { enabled: !!userAddress },
  });

  // Write hooks
  const {
    data: approveTxHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useWriteContract();

  const {
    data: launchTxHash,
    writeContract: writeLaunch,
    isPending: isLaunchPending,
    reset: resetLaunch,
  } = useWriteContract();

  // Wait for receipts
  const { data: approveReceipt, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId: base.id,
  });

  const { data: launchReceipt, isLoading: isLaunchConfirming } = useWaitForTransactionReceipt({
    hash: launchTxHash,
    chainId: base.id,
  });

  // Handle approve completion
  useEffect(() => {
    if (approveReceipt?.status === "success") {
      setStep("idle");
      resetApprove();
      refetchAllowance();
    } else if (approveReceipt?.status === "reverted") {
      setResult("failure");
      setStep("idle");
      resetApprove();
    }
  }, [approveReceipt, resetApprove, refetchAllowance]);

  // Handle launch completion
  useEffect(() => {
    if (launchReceipt?.status === "success") {
      setResult("success");
      setStep("idle");
      resetLaunch();
      refetchBalance();
      onSuccess?.();
    } else if (launchReceipt?.status === "reverted") {
      setResult("failure");
      setStep("idle");
      resetLaunch();
    }
  }, [launchReceipt, resetLaunch, refetchBalance, onSuccess]);

  // Check if needs approval
  const needsApproval = useCallback(() => {
    if (!donutAllowance) return true;
    return (donutAllowance as bigint) < LAUNCH_DEFAULTS.launchDonut;
  }, [donutAllowance]);

  // Has sufficient balance
  const hasSufficientBalance = useCallback(() => {
    if (!donutBalance) return false;
    return (donutBalance as bigint) >= LAUNCH_DEFAULTS.launchDonut;
  }, [donutBalance]);

  // Handle approve
  const handleApprove = useCallback(async () => {
    if (!userAddress) return;
    setStep("approving");
    try {
      await writeApprove({
        account: userAddress,
        address: TOKEN_ADDRESSES.donut as Address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [LAUNCHPAD_ADDRESSES.multicall as Address, LAUNCH_DEFAULTS.launchDonut * 2n],
        chainId: base.id,
      });
    } catch (error) {
      console.error("Approve failed:", error);
      setResult("failure");
      setStep("idle");
    }
  }, [userAddress, writeApprove]);

  // Handle launch
  const handleLaunch = useCallback(
    async (params: LaunchParams) => {
      if (!userAddress) return;
      setStep("launching");
      try {
        await writeLaunch({
          account: userAddress,
          address: LAUNCHPAD_ADDRESSES.multicall as Address,
          abi: LAUNCHPAD_MULTICALL_ABI,
          functionName: "launch",
          args: [
            params.name,
            params.symbol,
            params.uri,
            LAUNCH_DEFAULTS.launchDonut,
            LAUNCH_DEFAULTS.launchWeth,
            LAUNCH_DEFAULTS.rigEpochPeriod,
            LAUNCH_DEFAULTS.rigPriceMultiplier,
            LAUNCH_DEFAULTS.auctionEpochPeriod,
            LAUNCH_DEFAULTS.auctionPriceMultiplier,
          ],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Launch failed:", error);
        setResult("failure");
        setStep("idle");
      }
    },
    [userAddress, writeLaunch]
  );

  const isBusy =
    step !== "idle" ||
    isApprovePending ||
    isLaunchPending ||
    isApproveConfirming ||
    isLaunchConfirming;

  return {
    step,
    result,
    isBusy,
    donutBalance: donutBalance as bigint | undefined,
    needsApproval,
    hasSufficientBalance,
    handleApprove,
    handleLaunch,
    refetchBalance,
    refetchAllowance,
  };
}
