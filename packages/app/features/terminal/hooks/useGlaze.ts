"use client";

import { useState, useCallback } from "react";
import { type Address, type WalletClient, encodeFunctionData } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { MinerState } from "@/types/miner";
import {
  MINER_MULTICALL_ADDRESS,
  MINER_MULTICALL_ABI,
} from "@/config/miner-constants";
import { fetchMinerState } from "@/lib/miner/multicall";
import { wagmiConfig } from "@/lib/wagmi";

interface UseGlazeReturn {
  isGlazing: boolean;
  connectionError: string | null;
  message: string;
  setMessage: (message: string) => void;
  handleGlaze: () => Promise<void>;
}

export function useGlaze(
  userAddress: string | undefined,
  walletClient: WalletClient | undefined | null,
  minerState: MinerState,
  currentPrice: bigint,
  onSuccess: (newState: MinerState) => void
): UseGlazeReturn {
  const [isGlazing, setIsGlazing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleGlaze = useCallback(async () => {
    if (!userAddress || !walletClient?.account) return;

    setIsGlazing(true);
    setConnectionError(null);

    try {
      const signerAddress = walletClient.account.address as Address;
      if (userAddress.toLowerCase() !== signerAddress.toLowerCase()) {
        console.warn("Mine address mismatch; using signer address for provider", {
          userAddress,
          signerAddress,
        });
      }

      const freshState = await fetchMinerState(signerAddress);
      if (!freshState) {
        throw new Error("Unable to fetch the latest mine price");
      }

      const freshPrice = freshState.price;
      if (freshState.epochId !== minerState.epochId || freshPrice !== currentPrice) {
        console.info("Mine quote refreshed before submit", {
          displayedEpochId: minerState.epochId,
          latestEpochId: freshState.epochId,
          displayedPrice: currentPrice.toString(),
          latestPrice: freshPrice.toString(),
        });
      }

      const epochId = BigInt(freshState.epochId);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);
      const valueToSend = freshPrice;
      const uri = message.trim() || "We Glaze The World - GlazeCorp.io";

      const data = encodeFunctionData({
        abi: MINER_MULTICALL_ABI,
        functionName: "mine",
        args: [
          signerAddress,
          epochId,
          deadline,
          valueToSend,
          uri,
        ],
      });

      const hash = await walletClient.sendTransaction({
        to: MINER_MULTICALL_ADDRESS as Address,
        data,
        value: valueToSend,
        chain: walletClient.chain,
        account: walletClient.account,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash });
      setMessage("");

      const state = await fetchMinerState(signerAddress);
      if (state) onSuccess(state);
    } catch (error) {
      console.error(error);
      const txError = error as {
        shortMessage?: string;
        reason?: string;
        message?: string;
      };
      setConnectionError(
        "Transaction Failed: " +
          (txError.shortMessage || txError.reason || txError.message || "Unknown error")
      );
    } finally {
      setIsGlazing(false);
    }
  }, [userAddress, walletClient, minerState.epochId, currentPrice, message, onSuccess]);

  return {
    isGlazing,
    connectionError,
    message,
    setMessage,
    handleGlaze,
  };
}
