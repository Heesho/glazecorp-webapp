import { createPublicClient, http, fallback, isAddress, type Address } from "viem";
import { base } from "viem/chains";
import type { MinerState } from "@/types/miner";
import {
  MINER_MULTICALL_ADDRESS,
  MINER_MULTICALL_ABI,
  MINER_CONTRACT_ADDRESS,
  MINER_ABI,
  MINER_RPC_URLS,
} from "@/config/miner-constants";

// Singleton client - reused across all calls
const client = createPublicClient({
  chain: base,
  transport: fallback(
    MINER_RPC_URLS.map((url) =>
      http(url, {
        retryCount: 1,
        timeout: 10_000,
      })
    ),
    { rank: true }
  ),
});

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Fetch the current miner state from the multicall contract
 */
export async function fetchMinerState(
  userAddress: string = ZERO_ADDRESS
): Promise<MinerState | null> {
  if (!isAddress(userAddress)) {
    return null;
  }

  try {
    const data = await client.readContract({
      address: MINER_MULTICALL_ADDRESS as Address,
      abi: MINER_MULTICALL_ABI,
      functionName: "getMiner",
      args: [userAddress as Address],
    });

    return {
      epochId: Number(data.epochId),
      initPrice: data.initPrice,
      startTime: Number(data.startTime),
      glazed: data.glazed,
      price: data.price,
      dps: data.dps,
      nextDps: data.nextDps,
      donutPrice: data.donutPrice,
      miner: data.miner,
      uri: data.uri,
      ethBalance: data.ethBalance,
      wethBalance: data.wethBalance,
      donutBalance: data.donutBalance,
    };
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG_RPC_ERRORS === "true") {
      console.warn("Miner state RPC failed:", error);
    }
    return null;
  }
}

/**
 * Fetch the miner contract start time (for halving calculation)
 */
export async function fetchMinerStartTime(): Promise<number | null> {
  try {
    const startTime = await client.readContract({
      address: MINER_CONTRACT_ADDRESS as Address,
      abi: MINER_ABI,
      functionName: "startTime",
    });
    return Number(startTime);
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG_RPC_ERRORS === "true") {
      console.warn("Failed to fetch miner startTime:", error);
    }
    return null;
  }
}
