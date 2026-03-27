"use client";

import { useState, useEffect, useRef } from "react";
import type { MinerState, FarcasterProfile, FeedItem, GraphStat } from "@/types/miner";
import { fetchMinerState, fetchMinerStartTime } from "@/lib/miner/multicall";
import { fetchGraphData } from "@/lib/miner/graph";
import { fetchFarcasterProfile, fetchFarcasterProfiles } from "@/lib/miner/farcaster";
import { fetchEthPrice } from "@/lib/miner/price";
import { calculateNextHalving } from "@/lib/miner/calculations";
import { POLLING_INTERVAL_MS } from "@/config/miner-constants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const INITIAL_STATE: MinerState = {
  epochId: 0,
  initPrice: 0n,
  startTime: 0,
  glazed: 0n,
  price: 0n,
  dps: 0n,
  nextDps: 0n,
  donutPrice: 0n,
  miner: ZERO_ADDRESS,
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

interface UseMinerDataOptions {
  statePollingIntervalMs?: number;
}

export function useMinerData(
  userAddress?: string,
  options: UseMinerDataOptions = {}
): UseMinerDataReturn {
  const { statePollingIntervalMs = POLLING_INTERVAL_MS } = options;
  const [minerState, setMinerState] = useState<MinerState>(INITIAL_STATE);
  const [kingProfile, setKingProfile] = useState<FarcasterProfile | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedProfiles, setFeedProfiles] = useState<Record<string, FarcasterProfile>>({});
  const [stats, setStats] = useState({ revenue: "0", minted: "0" });
  const [userGraphStats, setUserGraphStats] = useState<GraphStat | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [nextHalvingTime, setNextHalvingTime] = useState<number | null>(null);
  const fetchedAddressesRef = useRef<Set<string>>(new Set());

  // Poll the contract state separately so the mine quote can refresh aggressively.
  useEffect(() => {
    let cancelled = false;
    let stateRequestInFlight = false;

    const refreshState = async () => {
      if (stateRequestInFlight) return;
      stateRequestInFlight = true;
      const addr = userAddress ?? ZERO_ADDRESS;
      try {
        const state = await fetchMinerState(addr);
        if (!cancelled && state) {
          setMinerState(state);
        }
      } finally {
        stateRequestInFlight = false;
      }
    };

    refreshState();
    const interval = setInterval(refreshState, statePollingIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [statePollingIntervalMs, userAddress]);

  // Slower-moving graph data and USD prices can refresh on a longer interval.
  useEffect(() => {
    let cancelled = false;

    const refreshAncillaryData = async () => {
      const addr = userAddress ?? ZERO_ADDRESS;
      const graphData = await fetchGraphData(addr);
      if (!cancelled && graphData) {
        if (graphData.miners?.[0]) {
          setStats(graphData.miners[0]);
        }
        if (graphData.account) {
          setUserGraphStats(graphData.account);
        }
        if (graphData.glazes) {
          const formattedFeed = graphData.glazes.map((g) => ({
            id: g.id,
            miner: g.account?.id || ZERO_ADDRESS,
            uri: g.uri,
            timestamp: Number(g.startTime),
            price: g.spent,
            earned: g.earned,
            mined: g.mined,
          }));
          setFeed(formattedFeed);
        }
      }

      const price = await fetchEthPrice();
      if (!cancelled && price > 0) {
        setEthPrice(price);
      }
    };

    refreshAncillaryData();
    const interval = setInterval(refreshAncillaryData, POLLING_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userAddress]);

  // Fetch king profile when miner changes
  useEffect(() => {
    const loadKingProfile = async () => {
      if (minerState.miner && minerState.miner !== ZERO_ADDRESS) {
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
        .filter(
          (addr) =>
            addr &&
            addr !== ZERO_ADDRESS.toLowerCase() &&
            !fetchedAddressesRef.current.has(addr)
        );

      if (addressesToFetch.length > 0) {
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
