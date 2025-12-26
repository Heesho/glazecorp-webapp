"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getRigs,
  getTopRigs,
  getRecentEpochs,
  searchRigs,
  getLaunchpadStats,
  type SubgraphRig,
  type SubgraphEpoch,
  type SubgraphLaunchpad,
} from "@/lib/api/launchpad";
import { POLLING_INTERVAL_MS } from "@/config/constants";

export type SortMode = "new" | "top" | "bump";

const PAGE_SIZE = 20; // 5x4 grid on desktop, fills mobile grids too

export function useExploreRigs() {
  const [rigs, setRigs] = useState<SubgraphRig[]>([]);
  const [recentEpochs, setRecentEpochs] = useState<SubgraphEpoch[]>([]);
  const [stats, setStats] = useState<SubgraphLaunchpad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("bump");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchRigs = useCallback(async () => {
    setIsLoading(true);
    try {
      let fetchedRigs: SubgraphRig[];
      const skip = (page - 1) * PAGE_SIZE;

      if (searchQuery.trim()) {
        fetchedRigs = await searchRigs(searchQuery.trim());
        // For search, paginate client-side
        setTotalCount(fetchedRigs.length);
        fetchedRigs = fetchedRigs.slice(skip, skip + PAGE_SIZE);
      } else if (sortMode === "top") {
        fetchedRigs = await getRigs(PAGE_SIZE, skip, "revenue", "desc");
      } else if (sortMode === "bump") {
        // Sort by most recently mined
        fetchedRigs = await getRigs(PAGE_SIZE, skip, "lastMined", "desc");
      } else {
        // Default: new (createdAt desc)
        fetchedRigs = await getRigs(PAGE_SIZE, skip, "createdAt", "desc");
      }

      setRigs(fetchedRigs);
    } catch (error) {
      console.error("Failed to fetch rigs:", error);
    }
    setIsLoading(false);
  }, [sortMode, searchQuery, page]);

  const fetchActivity = useCallback(async () => {
    try {
      const [epochs, launchpadStats] = await Promise.all([
        getRecentEpochs(10),
        getLaunchpadStats(),
      ]);
      setRecentEpochs(epochs);
      setStats(launchpadStats);
      // Set total count from stats (for non-search queries)
      if (launchpadStats && !searchQuery.trim()) {
        setTotalCount(parseInt(launchpadStats.rigCount || "0"));
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    }
  }, [searchQuery]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchRigs(), fetchActivity()]);
    };
    init();
  }, [fetchRigs, fetchActivity]);

  // Polling for activity updates
  useEffect(() => {
    const interval = setInterval(fetchActivity, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Reset to page 1 when sort mode or search changes
  useEffect(() => {
    setPage(1);
  }, [sortMode, searchQuery]);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    rigs,
    recentEpochs,
    stats,
    isLoading,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalPages,
    totalCount,
    refetch: fetchRigs,
  };
}
