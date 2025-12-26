"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import type { MinerState } from "@/types";
import { MULTICALL_ADDRESS, MULTICALL_ABI } from "@/lib/blockchain/contracts";
import { fetchMinerState } from "@/lib/blockchain/multicall";

interface UseGlazeReturn {
  isGlazing: boolean;
  connectionError: string | null;
  message: string;
  setMessage: (message: string) => void;
  handleGlaze: () => Promise<void>;
}

export function useGlaze(
  userAddress: string | undefined,
  walletClient: any,
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
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, signer);

      const epochId = minerState.epochId;
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const priceVal = BigInt(currentPrice);
      const valueToSend = priceVal + priceVal / 10n;

      const tx = await contract.mine(
        userAddress,
        epochId,
        deadline,
        valueToSend,
        message.trim() || "We Glaze The World - GlazeCorp.io",
        { value: valueToSend }
      );

      await tx.wait();
      setMessage("");

      const state = await fetchMinerState(userAddress);
      if (state) onSuccess(state);
    } catch (e: any) {
      console.error(e);
      setConnectionError("Transaction Failed: " + (e.reason || e.message || "Unknown error"));
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
