"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import type { MinerState, FarcasterProfile, FeedItem, GraphStat } from "@/types";
import { fetchMinerState, fetchMinerStartTime } from "@/lib/blockchain/multicall";
import { fetchGraphData } from "@/lib/api/graph";
import { fetchFarcasterProfile, fetchFarcasterProfiles } from "@/lib/api/farcaster";
import { fetchEthPrice } from "@/lib/api/price";
import { calculateNextHalving } from "@/lib/utils/calculations";
import { POLLING_INTERVAL_MS } from "@/config/constants";

const INITIAL_STATE: MinerState = {
  epochId: 0,
  initPrice: 0n,
  startTime: 0,
  glazed: 0n,
  price: 0n,
  dps: 0n,
  nextDps: 0n,
  donutPrice: 0n,
  miner: ethers.ZeroAddress,
  uri: "CONNECTING TO MAINNET...",
  ethBalance: 0n,
  donutBalance: 0n,
  wethBalance: 0n,
};

interface UseMinerDataReturn {
  minerState: MinerState;
  setMinerState: React.Dispatch<React.SetStateAction<MinerState>>;
  kingProfile: FarcasterProfile | null;
  feed: FeedItem[];
  feedProfiles: Record<string, FarcasterProfile>;
  stats: { revenue: string; minted: string };
  userGraphStats: GraphStat | null;
  ethPrice: number;
  nextHalvingTime: number | null;
}

export function useMinerData(userAddress?: string): UseMinerDataReturn {
  const [minerState, setMinerState] = useState<MinerState>(INITIAL_STATE);
  const [kingProfile, setKingProfile] = useState<FarcasterProfile | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedProfiles, setFeedProfiles] = useState<Record<string, FarcasterProfile>>({});
  const [stats, setStats] = useState({ revenue: "0", minted: "0" });
  const [userGraphStats, setUserGraphStats] = useState<GraphStat | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [nextHalvingTime, setNextHalvingTime] = useState<number | null>(null);
  const fetchedAddressesRef = useRef<Set<string>>(new Set());

  // Main polling cycle
  useEffect(() => {
    const refresh = async () => {
      const addr = userAddress ?? ethers.ZeroAddress;

      // Contract State
      const state = await fetchMinerState(addr);
      if (state) setMinerState(state);

      // Graph Data
      const graphData = await fetchGraphData(addr);
      if (graphData) {
        if (graphData.miners?.[0]) {
          setStats(graphData.miners[0]);
        }
        if (graphData.account) {
          setUserGraphStats(graphData.account);
        }
        if (graphData.glazes) {
          const formattedFeed = graphData.glazes.map((g) => ({
            id: g.id,
            miner: g.account?.id || ethers.ZeroAddress,
            uri: g.uri,
            timestamp: Number(g.startTime),
            price: g.spent,
            earned: g.earned,
            mined: g.mined,
          }));
          setFeed(formattedFeed);
        }
      }

      // ETH Price
      const price = await fetchEthPrice();
      if (price > 0) setEthPrice(price);
    };

    refresh();
    const interval = setInterval(refresh, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userAddress]);

  // Fetch king profile when miner changes
  useEffect(() => {
    const loadKingProfile = async () => {
      if (minerState.miner && minerState.miner !== ethers.ZeroAddress) {
        const profile = await fetchFarcasterProfile(minerState.miner);
        setKingProfile(profile);
      }
    };
    loadKingProfile();
  }, [minerState.miner]);

  // Fetch halving data once on mount
  useEffect(() => {
    const loadHalvingData = async () => {
      const startTime = await fetchMinerStartTime();
      if (startTime) {
        const nextHalving = calculateNextHalving(startTime);
        setNextHalvingTime(nextHalving);
      }
    };
    loadHalvingData();
  }, []);

  // Fetch profiles for feed
  useEffect(() => {
    const loadProfiles = async () => {
      const addressesToFetch = feed
        .map((f) => f.miner.toLowerCase())
        .filter((addr) => addr && addr !== ethers.ZeroAddress.toLowerCase() && !fetchedAddressesRef.current.has(addr));

      if (addressesToFetch.length > 0) {
        // Mark as fetched immediately to prevent duplicate requests
        addressesToFetch.forEach((addr) => fetchedAddressesRef.current.add(addr));
        const newProfiles = await fetchFarcasterProfiles(addressesToFetch);
        setFeedProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    };
    if (feed.length > 0) loadProfiles();
  }, [feed]);

  return {
    minerState,
    setMinerState,
    kingProfile,
    feed,
    feedProfiles,
    stats,
    userGraphStats,
    ethPrice,
    nextHalvingTime,
  };
}
