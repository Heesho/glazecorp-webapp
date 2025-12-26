"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import { zeroAddress, type Address } from "viem";

import {
  LAUNCHPAD_ADDRESSES,
  LAUNCHPAD_CORE_ABI,
  LAUNCHPAD_MULTICALL_ABI,
  ERC20_ABI,
  type FranchiseAuctionState,
} from "@/lib/blockchain/contracts";
import { getRigs, type SubgraphRig } from "@/lib/api/launchpad";

export type FranchiseAuctionItem = {
  rigAddress: Address;
  auctionState: FranchiseAuctionState;
  tokenName?: string;
  tokenSymbol?: string;
  rigUri?: string;
};

// Hook to get total number of deployed rigs
function useDeployedRigsCount() {
  const { data: count, isLoading, error } = useReadContract({
    address: LAUNCHPAD_ADDRESSES.core as Address,
    abi: LAUNCHPAD_CORE_ABI,
    functionName: "deployedRigsLength",
    chainId: base.id,
    query: {
      refetchInterval: 30_000,
    },
  });

  return {
    count: count as bigint | undefined,
    isLoading,
    error,
  };
}

// Hook to get all rig addresses from Core contract
export function useAllRigAddresses() {
  const { count } = useDeployedRigsCount();
  const rigCount = count ? Number(count) : 0;

  // Create array of indices for multicall
  const indices = Array.from({ length: rigCount }, (_, i) => i);

  const contracts = indices.map((index) => ({
    address: LAUNCHPAD_ADDRESSES.core as Address,
    abi: LAUNCHPAD_CORE_ABI,
    functionName: "deployedRigs" as const,
    args: [BigInt(index)] as const,
    chainId: base.id,
  }));

  const { data: rigAddresses, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: rigCount > 0,
    },
  });

  const addresses = rigAddresses
    ?.map((result) => result.result as Address | undefined)
    .filter((addr): addr is Address => !!addr);

  return {
    addresses: addresses ?? [],
    isLoading,
    error,
  };
}

// Hook to get all auction states for franchise rigs
export function useFranchiseAuctions(account?: Address) {
  const { addresses: rigAddresses, isLoading: isLoadingAddresses } = useAllRigAddresses();
  const [subgraphRigs, setSubgraphRigs] = useState<SubgraphRig[]>([]);

  // Fetch rig data from subgraph (for symbols)
  useEffect(() => {
    getRigs(100, 0, "createdAt", "desc").then(setSubgraphRigs);
  }, []);

  // Build symbol map from subgraph data (rig address -> symbol)
  const symbolMap = useMemo(() => {
    const map = new Map<string, { symbol: string; uri: string }>();
    subgraphRigs.forEach((rig) => {
      map.set(rig.id.toLowerCase(), { symbol: rig.symbol, uri: rig.uri });
    });
    return map;
  }, [subgraphRigs]);

  // Get auction states for all rigs
  const auctionContracts = rigAddresses.map((address) => ({
    address: LAUNCHPAD_ADDRESSES.multicall as Address,
    abi: LAUNCHPAD_MULTICALL_ABI,
    functionName: "getAuction" as const,
    args: [address, account ?? zeroAddress] as const,
    chainId: base.id,
  }));

  const { data: auctionStates, isLoading: isLoadingAuctions, refetch } = useReadContracts({
    contracts: auctionContracts,
    query: {
      enabled: rigAddresses.length > 0,
      refetchInterval: 10_000,
    },
  });

  // Combine data
  const auctions: FranchiseAuctionItem[] = useMemo(() => {
    return (auctionStates ?? [])
      .map((result, index) => {
        const state = result.result as FranchiseAuctionState | undefined;
        if (!state) return null;

        const rigData = symbolMap.get(rigAddresses[index].toLowerCase());

        return {
          rigAddress: rigAddresses[index],
          auctionState: state,
          tokenSymbol: rigData?.symbol,
          rigUri: rigData?.uri,
        } as FranchiseAuctionItem;
      })
      .filter((item): item is FranchiseAuctionItem => item !== null);
  }, [auctionStates, rigAddresses, symbolMap]);

  // Sort by profitability (wethAccumulated vs LP price)
  const sortedAuctions = useMemo(() => {
    return [...auctions].sort((a, b) => {
      const aLpCost = (a.auctionState.price * a.auctionState.paymentTokenPrice) / BigInt(1e18);
      const bLpCost = (b.auctionState.price * b.auctionState.paymentTokenPrice) / BigInt(1e18);
      const aProfit = a.auctionState.wethAccumulated - aLpCost;
      const bProfit = b.auctionState.wethAccumulated - bLpCost;
      return bProfit > aProfit ? 1 : -1;
    });
  }, [auctions]);

  return {
    auctions: sortedAuctions,
    isLoading: isLoadingAddresses || isLoadingAuctions,
    refetch,
  };
}

// Hook to buy from a franchise auction
export function useFranchiseAuctionBuy(
  rigAddress?: Address,
  account?: Address,
  auctionState?: FranchiseAuctionState,
  onSuccess?: () => void
) {
  const [buyStep, setBuyStep] = useState<"idle" | "approving" | "buying" | "confirming">("idle");
  const [buyResult, setBuyResult] = useState<"success" | "failure" | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleApproveAndBuy = useCallback(
    async (amount: bigint) => {
      if (!rigAddress || !account || !auctionState) return;

      setBuyStep("approving");
      setBuyResult(null);

      try {
        // First approve the LP tokens
        writeContract(
          {
            address: auctionState.paymentToken,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [LAUNCHPAD_ADDRESSES.multicall as Address, amount],
            chainId: base.id,
          },
          {
            onSuccess: () => {
              // After approval, do the buy
              setBuyStep("buying");
              const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

              writeContract(
                {
                  address: LAUNCHPAD_ADDRESSES.multicall as Address,
                  abi: LAUNCHPAD_MULTICALL_ABI,
                  functionName: "buy",
                  args: [rigAddress, auctionState.epochId, deadline, amount],
                  chainId: base.id,
                },
                {
                  onSuccess: () => {
                    setBuyStep("confirming");
                  },
                  onError: (error) => {
                    console.error("Buy error:", error);
                    setBuyStep("idle");
                    setBuyResult("failure");
                    setTimeout(() => setBuyResult(null), 3000);
                  },
                }
              );
            },
            onError: (error) => {
              console.error("Approve error:", error);
              setBuyStep("idle");
              setBuyResult("failure");
              setTimeout(() => setBuyResult(null), 3000);
            },
          }
        );
      } catch (error) {
        console.error("Transaction error:", error);
        setBuyStep("idle");
        setBuyResult("failure");
        setTimeout(() => setBuyResult(null), 3000);
      }
    },
    [rigAddress, account, auctionState, writeContract]
  );

  // Watch for confirmation
  if (isSuccess && buyStep === "confirming") {
    setBuyStep("idle");
    setBuyResult("success");
    onSuccess?.();
    setTimeout(() => setBuyResult(null), 3000);
  }

  const isBusy = buyStep !== "idle" || isPending || isConfirming;

  return {
    buyStep,
    buyResult,
    isBusy,
    handleApproveAndBuy,
  };
}
