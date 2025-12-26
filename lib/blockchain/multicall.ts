import { ethers } from 'ethers';
import type { MinerState } from '@/types';
import {
  MULTICALL_ADDRESS,
  MULTICALL_ABI,
  MINER_ADDRESS,
  MINER_ABI,
  RPC_URL,
} from './contracts';

/**
 * Fetch the current miner state from the multicall contract
 */
export async function fetchMinerState(
  userAddress: string = ethers.ZeroAddress
): Promise<MinerState | null> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);
    const data = await contract.getMiner(userAddress);

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
    console.error("RPC Error:", error);
    return null;
  }
}

/**
 * Fetch the miner contract start time (for halving calculation)
 */
export async function fetchMinerStartTime(): Promise<number | null> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(MINER_ADDRESS, MINER_ABI, provider);
    const startTime = await contract.startTime();
    return Number(startTime);
  } catch (error) {
    console.error("Failed to fetch miner startTime:", error);
    return null;
  }
}
