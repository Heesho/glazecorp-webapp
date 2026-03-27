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
    if (!userAddress || !walletClient) return;

    setIsGlazing(true);
    setConnectionError(null);

    try {
      const epochId = BigInt(minerState.epochId);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
      const priceVal = BigInt(currentPrice);
      const valueToSend = priceVal + priceVal / 10n;
      const uri = message.trim() || "We Glaze The World - GlazeCorp.io";

      const data = encodeFunctionData({
        abi: MINER_MULTICALL_ABI,
        functionName: "mine",
        args: [
          userAddress as Address,
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
        account: walletClient.account!,
      });

      await waitForTransactionReceipt(wagmiConfig, { hash });
      setMessage("");

      const state = await fetchMinerState(userAddress);
      if (state) onSuccess(state);
    } catch (e: any) {
      console.error(e);
      setConnectionError(
        "Transaction Failed: " +
          (e.shortMessage || e.reason || e.message || "Unknown error")
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
