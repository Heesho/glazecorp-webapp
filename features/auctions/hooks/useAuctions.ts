"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { type Address, zeroAddress } from "viem";

import {
  LSG_ADDRESSES,
  LSG_MULTICALL_ABI,
  ERC20_ABI,
  PAYMENT_TOKEN_SYMBOLS,
} from "@/lib/blockchain/contracts";
import { POLLING_INTERVAL_MS } from "@/config/constants";

// Strategy data from LSG Multicall
export interface StrategyAuctionData {
  strategy: Address;
  bribe: Address;
  bribeRouter: Address;
  paymentToken: Address;
  paymentReceiver: Address;
  isAlive: boolean;
  paymentTokenDecimals: number;
  strategyWeight: bigint;
  votePercent: bigint;
  claimable: bigint;
  pendingRevenue: bigint;
  routerRevenue: bigint;
  totalPotentialRevenue: bigint;
  epochPeriod: bigint;
  priceMultiplier: bigint;
  minInitPrice: bigint;
  epochId: bigint;
  initPrice: bigint;
  startTime: bigint;
  currentPrice: bigint;
  revenueBalance: bigint;
  accountVotes: bigint;
  accountPaymentTokenBalance: bigint;
}

export type BuyStep = "idle" | "approving" | "buying";

export function useAuctions(userAddress?: Address) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyAuctionData | null>(null);
  const [buyStep, setBuyStep] = useState<BuyStep>("idle");
  const [buyResult, setBuyResult] = useState<"success" | "failure" | null>(null);
  const [pendingBuy, setPendingBuy] = useState<{ strategy: StrategyAuctionData; amount: bigint } | null>(null);

  // Clear result after delay
  useEffect(() => {
    if (buyResult) {
      const timeout = setTimeout(() => setBuyResult(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [buyResult]);

  // Fetch all strategies data
  const { data: rawStrategiesData, refetch: refetchStrategies, isLoading } = useReadContract({
    address: LSG_ADDRESSES.lsgMulticall as Address,
    abi: LSG_MULTICALL_ABI,
    functionName: "getAllStrategiesData",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: {
      refetchInterval: POLLING_INTERVAL_MS,
    },
  });

  // Parse strategies data
  const strategies = useMemo(() => {
    if (!rawStrategiesData) return [];
    return (rawStrategiesData as unknown as StrategyAuctionData[]).filter((s) => s.isAlive);
  }, [rawStrategiesData]);

  // Get unique payment tokens
  const uniquePaymentTokens = useMemo(() => {
    const tokens = new Set<Address>();
    strategies.forEach((s) => tokens.add(s.paymentToken));
    return Array.from(tokens);
  }, [strategies]);

  // Fetch allowances for all unique payment tokens
  const allowanceContracts = useMemo(() => {
    if (!userAddress) return [];
    return uniquePaymentTokens.map((token) => ({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance" as const,
      args: [userAddress, LSG_ADDRESSES.lsgMulticall as Address] as const,
      chainId: base.id,
    }));
  }, [userAddress, uniquePaymentTokens]);

  const { data: allowancesData, refetch: refetchAllowances } = useReadContracts({
    contracts: allowanceContracts,
    query: {
      enabled: allowanceContracts.length > 0,
    },
  });

  // Map allowances by payment token
  const allowancesByToken = useMemo(() => {
    const map = new Map<string, bigint>();
    if (allowancesData) {
      uniquePaymentTokens.forEach((token, i) => {
        const result = allowancesData[i]?.result;
        if (result !== undefined) {
          map.set(token.toLowerCase(), result as bigint);
        }
      });
    }
    return map;
  }, [allowancesData, uniquePaymentTokens]);

  // Auto-select first strategy
  useEffect(() => {
    if (!selectedStrategy && strategies.length > 0) {
      setSelectedStrategy(strategies[0]);
    }
  }, [strategies, selectedStrategy]);

  // Update selected strategy when data refreshes
  useEffect(() => {
    if (selectedStrategy && strategies.length > 0) {
      const updated = strategies.find(
        (s) => s.strategy.toLowerCase() === selectedStrategy.strategy.toLowerCase()
      );
      if (updated) {
        setSelectedStrategy(updated);
      }
    }
  }, [strategies, selectedStrategy]);

  // Write hooks
  const {
    data: approveTxHash,
    writeContract: writeApprove,
    isPending: isApprovePending,
    reset: resetApprove,
  } = useWriteContract();

  const {
    data: buyTxHash,
    writeContract: writeBuy,
    isPending: isBuyPending,
    reset: resetBuy,
  } = useWriteContract();

  // Wait for receipts
  const { data: approveReceipt, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId: base.id,
  });

  const { data: buyReceipt, isLoading: isBuyConfirming } = useWaitForTransactionReceipt({
    hash: buyTxHash,
    chainId: base.id,
  });

  // Handle approve completion - trigger pending buy if exists
  useEffect(() => {
    if (approveReceipt?.status === "success") {
      resetApprove();
      refetchAllowances();
      refetchStrategies();
      // If there's a pending buy, trigger it
      if (pendingBuy) {
        setBuyStep("buying");
        const { strategy, amount } = pendingBuy;
        setPendingBuy(null);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 900);
        try {
          writeBuy({
            account: userAddress!,
            address: LSG_ADDRESSES.lsgMulticall as Address,
            abi: LSG_MULTICALL_ABI,
            functionName: "distributeAndBuy",
            args: [strategy.strategy, strategy.epochId, deadline, amount],
            chainId: base.id,
          });
        } catch {
          setBuyResult("failure");
          setBuyStep("idle");
        }
      } else {
        setBuyStep("idle");
      }
    } else if (approveReceipt?.status === "reverted") {
      setBuyResult("failure");
      setBuyStep("idle");
      setPendingBuy(null);
      resetApprove();
    }
  }, [approveReceipt, resetApprove, refetchAllowances, refetchStrategies, pendingBuy, userAddress, writeBuy]);

  // Handle buy completion
  useEffect(() => {
    if (buyReceipt?.status === "success") {
      setBuyResult("success");
      setBuyStep("idle");
      resetBuy();
      refetchStrategies();
    } else if (buyReceipt?.status === "reverted") {
      setBuyResult("failure");
      setBuyStep("idle");
      resetBuy();
    }
  }, [buyReceipt, resetBuy, refetchStrategies]);

  // Approve payment tokens for a specific strategy
  const handleApproveForStrategy = useCallback(
    async (strategy: StrategyAuctionData) => {
      if (!userAddress) return;
      setBuyStep("approving");
      setSelectedStrategy(strategy);
      try {
        await writeApprove({
          account: userAddress,
          address: strategy.paymentToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [
            LSG_ADDRESSES.lsgMulticall as Address,
            BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
          ],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Approve failed:", error);
        setBuyResult("failure");
        setBuyStep("idle");
      }
    },
    [userAddress, writeApprove]
  );

  // Legacy approve (uses selectedStrategy)
  const handleApprove = useCallback(async () => {
    if (!selectedStrategy) return;
    await handleApproveForStrategy(selectedStrategy);
  }, [selectedStrategy, handleApproveForStrategy]);

  // Buy from auction for a specific strategy
  const handleBuyForStrategy = useCallback(
    async (strategy: StrategyAuctionData, maxPaymentAmount: bigint) => {
      if (!userAddress) return;
      setBuyStep("buying");
      setSelectedStrategy(strategy);
      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 900); // 15 min

        await writeBuy({
          account: userAddress,
          address: LSG_ADDRESSES.lsgMulticall as Address,
          abi: LSG_MULTICALL_ABI,
          functionName: "distributeAndBuy",
          args: [
            strategy.strategy,
            strategy.epochId,
            deadline,
            maxPaymentAmount,
          ],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Buy failed:", error);
        setBuyResult("failure");
        setBuyStep("idle");
      }
    },
    [userAddress, writeBuy]
  );

  // Legacy buy (uses selectedStrategy)
  const handleBuy = useCallback(
    async (maxPaymentAmount: bigint) => {
      if (!selectedStrategy) return;
      await handleBuyForStrategy(selectedStrategy, maxPaymentAmount);
    },
    [selectedStrategy, handleBuyForStrategy]
  );

  // Approve and buy in sequence - sets pending buy then triggers approve
  const handleApproveAndBuy = useCallback(
    async (strategy: StrategyAuctionData, amount: bigint) => {
      if (!userAddress) return;
      setPendingBuy({ strategy, amount });
      setBuyStep("approving");
      setSelectedStrategy(strategy);
      try {
        await writeApprove({
          account: userAddress,
          address: strategy.paymentToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [
            LSG_ADDRESSES.lsgMulticall as Address,
            BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
          ],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Approve failed:", error);
        setBuyResult("failure");
        setBuyStep("idle");
        setPendingBuy(null);
      }
    },
    [userAddress, writeApprove]
  );

  // Check if needs approval for a specific payment token
  const needsApprovalForToken = useCallback(
    (paymentToken: Address, amount: bigint) => {
      const allowance = allowancesByToken.get(paymentToken.toLowerCase());
      if (allowance === undefined) return true;
      return allowance < amount;
    },
    [allowancesByToken]
  );

  // Legacy needsApproval (uses selectedStrategy)
  const needsApproval = useCallback(
    (amount: bigint) => {
      if (!selectedStrategy) return true;
      return needsApprovalForToken(selectedStrategy.paymentToken, amount);
    },
    [selectedStrategy, needsApprovalForToken]
  );

  const isBusy =
    buyStep !== "idle" ||
    isApprovePending ||
    isBuyPending ||
    isApproveConfirming ||
    isBuyConfirming;

  // Get payment token symbol
  const getPaymentTokenSymbol = (address: Address) => {
    return PAYMENT_TOKEN_SYMBOLS[address.toLowerCase()] || "TOKEN";
  };

  return {
    strategies,
    selectedStrategy,
    setSelectedStrategy,
    isLoading,
    buyStep,
    buyResult,
    isBusy,
    needsApproval,
    needsApprovalForToken,
    handleApprove,
    handleApproveForStrategy,
    handleApproveAndBuy,
    handleBuy,
    handleBuyForStrategy,
    refetchStrategies,
    getPaymentTokenSymbol,
    allowancesByToken,
  };
}
