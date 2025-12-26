"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { parseUnits, formatUnits } from "viem";
import type { Address } from "viem";

import { LAUNCHPAD_ADDRESSES, TOKEN_ADDRESSES, ERC20_ABI } from "@/lib/blockchain/contracts";
import type { RigInfo } from "./useRigState";

const UNISWAP_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    name: "getAmountsOut",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export type SwapStep = "idle" | "approving" | "swapping" | "confirming";
export type SwapResult = "success" | "failure" | null;
export type SwapDirection = "buy" | "sell";

export function useSwapRig(
  rigInfo?: RigInfo | null,
  userAddress?: Address,
  onSuccess?: () => void
) {
  const [swapStep, setSwapStep] = useState<SwapStep>("idle");
  const [swapResult, setSwapResult] = useState<SwapResult>(null);
  const [direction, setDirection] = useState<SwapDirection>("buy");
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");

  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Parse input amount
  const parsedInput = useMemo(() => {
    try {
      if (!inputAmount) return 0n;
      return parseUnits(inputAmount, 18);
    } catch {
      return 0n;
    }
  }, [inputAmount]);

  // Get swap path
  const swapPath = useMemo(() => {
    if (!rigInfo?.unitAddress) return [];
    if (direction === "buy") {
      return [TOKEN_ADDRESSES.weth, rigInfo.unitAddress];
    } else {
      return [rigInfo.unitAddress, TOKEN_ADDRESSES.weth];
    }
  }, [rigInfo?.unitAddress, direction]);

  // Get quote
  const { data: quoteData } = useReadContract({
    address: LAUNCHPAD_ADDRESSES.uniV2Router as Address,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: "getAmountsOut",
    args: parsedInput > 0n && swapPath.length === 2 ? [parsedInput, swapPath as Address[]] : undefined,
    chainId: base.id,
    query: {
      enabled: parsedInput > 0n && swapPath.length === 2,
      refetchInterval: 10000,
    },
  });

  // Update output amount when quote changes
  useEffect(() => {
    if (quoteData && Array.isArray(quoteData) && quoteData.length > 1) {
      const out = quoteData[1] as bigint;
      setOutputAmount(formatUnits(out, 18));
    } else {
      setOutputAmount("");
    }
  }, [quoteData]);

  // Check allowance for sells
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: rigInfo?.unitAddress as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress && rigInfo ? [userAddress, LAUNCHPAD_ADDRESSES.uniV2Router as Address] : undefined,
    chainId: base.id,
    query: {
      enabled: !!userAddress && !!rigInfo?.unitAddress && direction === "sell",
    },
  });

  const needsApproval = direction === "sell" && parsedInput > 0n && (allowance as bigint || 0n) < parsedInput;

  const handleApprove = useCallback(async () => {
    if (!rigInfo?.unitAddress || !userAddress) return;

    setSwapStep("approving");
    setSwapResult(null);

    try {
      writeContract(
        {
          address: rigInfo.unitAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [LAUNCHPAD_ADDRESSES.uniV2Router as Address, parsedInput],
          chainId: base.id,
        },
        {
          onSuccess: () => {
            setSwapStep("idle");
            refetchAllowance();
          },
          onError: (error) => {
            console.error("Approve error:", error);
            setSwapStep("idle");
            setSwapResult("failure");
            setTimeout(() => setSwapResult(null), 3000);
          },
        }
      );
    } catch (error) {
      console.error("Approve error:", error);
      setSwapStep("idle");
      setSwapResult("failure");
      setTimeout(() => setSwapResult(null), 3000);
    }
  }, [rigInfo?.unitAddress, userAddress, parsedInput, writeContract, refetchAllowance]);

  const handleSwap = useCallback(async () => {
    if (!rigInfo?.unitAddress || !userAddress || parsedInput === 0n) return;
    if (!quoteData || !Array.isArray(quoteData) || quoteData.length < 2) return;

    setSwapStep("swapping");
    setSwapResult(null);

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      const minOut = ((quoteData[1] as bigint) * 95n) / 100n; // 5% slippage

      if (direction === "buy") {
        writeContract(
          {
            address: LAUNCHPAD_ADDRESSES.uniV2Router as Address,
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: "swapExactETHForTokens",
            args: [minOut, swapPath as Address[], userAddress, deadline],
            value: parsedInput,
            chainId: base.id,
          },
          {
            onSuccess: () => {
              setSwapStep("confirming");
            },
            onError: (error) => {
              console.error("Swap error:", error);
              setSwapStep("idle");
              setSwapResult("failure");
              setTimeout(() => setSwapResult(null), 3000);
            },
          }
        );
      } else {
        writeContract(
          {
            address: LAUNCHPAD_ADDRESSES.uniV2Router as Address,
            abi: UNISWAP_V2_ROUTER_ABI,
            functionName: "swapExactTokensForETH",
            args: [parsedInput, minOut, swapPath as Address[], userAddress, deadline],
            chainId: base.id,
          },
          {
            onSuccess: () => {
              setSwapStep("confirming");
            },
            onError: (error) => {
              console.error("Swap error:", error);
              setSwapStep("idle");
              setSwapResult("failure");
              setTimeout(() => setSwapResult(null), 3000);
            },
          }
        );
      }
    } catch (error) {
      console.error("Swap error:", error);
      setSwapStep("idle");
      setSwapResult("failure");
      setTimeout(() => setSwapResult(null), 3000);
    }
  }, [rigInfo?.unitAddress, userAddress, parsedInput, quoteData, direction, swapPath, writeContract]);

  // Watch for confirmation
  if (isSuccess && swapStep === "confirming") {
    setSwapStep("idle");
    setSwapResult("success");
    setInputAmount("");
    setOutputAmount("");
    onSuccess?.();
    setTimeout(() => setSwapResult(null), 3000);
  }

  const isBusy = swapStep !== "idle" || isWritePending || isConfirming;

  return {
    swapStep,
    swapResult,
    isBusy,
    direction,
    setDirection,
    inputAmount,
    setInputAmount,
    outputAmount,
    needsApproval,
    handleApprove,
    handleSwap,
  };
}
