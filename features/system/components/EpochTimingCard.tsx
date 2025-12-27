"use client";

import React, { useMemo } from "react";
import { Card } from "@/components/ui";
import type { SystemOverview } from "../hooks/useSystemData";

interface EpochTimingCardProps {
  systemOverview: SystemOverview | null;
}

const formatTime = (seconds: bigint): string => {
  const s = Number(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDate = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function EpochTimingCard({ systemOverview }: EpochTimingCardProps) {
  const epochProgress = useMemo(() => {
    if (!systemOverview) return 0;
    const duration = Number(systemOverview.epochDuration);
    const remaining = Number(systemOverview.timeUntilNextEpoch);
    return ((duration - remaining) / duration) * 100;
  }, [systemOverview]);

  if (!systemOverview) {
    return (
      <Card noPadding>
        <div className="p-4 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4" />
          <div className="h-8 bg-zinc-800 rounded w-2/3" />
        </div>
      </Card>
    );
  }

  return (
    <Card noPadding>
      <div className="p-4">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
          Epoch Timing
        </div>

        <div className="space-y-3">
          {/* Progress bar */}
          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-glaze-600 to-glaze-400 transition-all duration-1000"
              style={{ width: `${epochProgress}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-mono">
            <div>
              <span className="text-zinc-500">Started:</span>{" "}
              <span className="text-white">
                {formatDate(systemOverview.currentEpochStart)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Next:</span>{" "}
              <span className="text-glaze-400">
                {formatDate(systemOverview.nextEpochStart)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <span className="text-zinc-500 text-xs">Time remaining: </span>
            <span className="text-lg font-bold font-mono text-white">
              {formatTime(systemOverview.timeUntilNextEpoch)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
