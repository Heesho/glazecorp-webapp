"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TrendingUp, Clock, Flame, ChevronLeft, ChevronRight } from "lucide-react";

import { useExploreRigs, type SortMode } from "../hooks/useExploreRigs";
import { type SubgraphRig, ipfsToHttp, fetchRigMetadata, calculateCurrentPrice } from "@/lib/api/launchpad";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";

// Subgraph returns values as formatted decimals, not wei
const formatNumber = (value: string) => {
  const num = parseFloat(value || "0");
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const formatEth = (value: string) => {
  const num = parseFloat(value || "0");
  return num.toFixed(3);
};

function RigCard({ rig, isBumped }: { rig: SubgraphRig; isBumped?: boolean }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    if (rig.uri) {
      fetchRigMetadata(rig.uri).then((metadata) => {
        if (metadata?.image) {
          setImageUrl(ipfsToHttp(metadata.image));
        }
      });
    }
  }, [rig.uri]);

  // Update price every second (Dutch auction decays)
  useEffect(() => {
    const updatePrice = () => setCurrentPrice(calculateCurrentPrice(rig));
    updatePrice();
    const interval = setInterval(updatePrice, 1000);
    return () => clearInterval(interval);
  }, [rig]);

  // Market cap = minted tokens * current token price (in ETH)
  const totalMinted = parseFloat(rig.minted || "0");
  const marketCapEth = totalMinted * currentPrice;

  return (
    <Link
      href={`/franchise/${rig.id}`}
      className={`block w-full text-left bg-zinc-900/50 hover:bg-zinc-800/50 border rounded-lg transition-all overflow-hidden ${
        isBumped
          ? "border-glaze-400 border-2 animate-bump-glow"
          : "border-zinc-800 hover:border-glaze-500/30"
      }`}
    >
      {/* Image - square aspect ratio for compact view */}
      <div className="aspect-square w-full bg-zinc-800 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={rig.name}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-glaze-500/20 to-zinc-900">
            <span className="text-glaze-400 font-bold text-lg">{rig.symbol?.slice(0, 2) || "?"}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        {/* Name & Ticker */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-white truncate">{rig.name || "Unknown"}</span>
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">${rig.symbol}</span>
        </div>

        {/* Mine Price & Market Cap */}
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-glaze-400">Ξ{currentPrice.toFixed(4)}</span>
          <span className="text-zinc-500">MC Ξ{marketCapEth >= 1 ? marketCapEth.toFixed(2) : marketCapEth.toFixed(4)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ExplorePanel() {
  const {
    rigs,
    isLoading,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalPages,
  } = useExploreRigs();

  // Track bumped rigs for animation
  const prevRigOrderRef = useRef<string[]>([]);
  const [bumpedIds, setBumpedIds] = useState<Set<string>>(new Set());

  // Detect when rigs move up in position (bump animation)
  useEffect(() => {
    const currentOrder = rigs.map((r) => r.id);

    if (rigs.length === 0 || sortMode !== "bump" || page !== 1) {
      prevRigOrderRef.current = currentOrder;
      return;
    }

    const prevOrder = prevRigOrderRef.current;

    // Skip on initial load (no previous order)
    if (prevOrder.length === 0) {
      prevRigOrderRef.current = currentOrder;
      return;
    }

    // Find rigs that moved up to higher positions
    const newBumped = new Set<string>();
    currentOrder.forEach((id, newIndex) => {
      const oldIndex = prevOrder.indexOf(id);
      // If rig moved up significantly (was lower, now in top positions)
      // or is new to the list and in top positions
      if (oldIndex === -1 && newIndex < 4) {
        // New rig appeared in top 4
        newBumped.add(id);
      } else if (oldIndex > newIndex && newIndex < 4 && oldIndex - newIndex >= 2) {
        // Moved up by at least 2 positions into top 4
        newBumped.add(id);
      }
    });

    // Always update ref after comparison
    prevRigOrderRef.current = currentOrder;

    if (newBumped.size > 0) {
      setBumpedIds(newBumped);
      // Clear bump animation after 2 seconds
      const timeout = setTimeout(() => setBumpedIds(new Set()), 2000);
      return () => clearTimeout(timeout);
    }
  }, [rigs, sortMode, page]);

  const sortOptions: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: "new", label: "New", icon: <Clock size={12} /> },
    { mode: "top", label: "Top", icon: <TrendingUp size={12} /> },
    { mode: "bump", label: "Bump", icon: <Flame size={12} /> },
  ];

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col h-full px-3 pb-3">
      {/* Search & Sort - Fixed below header */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-[#131313]/40 backdrop-blur-sm px-3 lg:px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rigs..."
                className="!py-2 !text-xs"
              />
            </div>
            <div className="flex gap-1">
              {sortOptions.map((opt) => (
                <Button
                  key={opt.mode}
                  variant={sortMode === opt.mode ? "primary" : "secondary"}
                  onClick={() => setSortMode(opt.mode)}
                  className="!px-3 !py-2 !text-xs !normal-case !tracking-normal gap-1"
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed search bar */}
      <div className="h-12" />

      {/* Rigs Grid */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <div className="text-zinc-600 text-xs font-mono">Loading...</div>
          </div>
        ) : rigs.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <div className="text-zinc-600 text-xs font-mono">No rigs found</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
            {rigs.map((rig) => (
              <RigCard
                key={rig.id}
                rig={rig}
                isBumped={bumpedIds.has(rig.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination - At bottom of scroll */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-4">
          <Button
            variant="secondary"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="!p-2"
          >
            <ChevronLeft size={14} />
          </Button>

          {getPageNumbers().map((p, i) => (
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-corp-500 text-sm font-mono">...</span>
            ) : (
              <Button
                key={p}
                variant={page === p ? "primary" : "secondary"}
                onClick={() => setPage(p)}
                className="!min-w-[32px] !px-2 !py-1 !text-sm"
              >
                {p}
              </Button>
            )
          ))}

          <Button
            variant="secondary"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="!p-2"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
