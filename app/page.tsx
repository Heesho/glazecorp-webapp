"use client";

import React from "react";
import { ethers } from "ethers";
import { Zap } from "lucide-react";
import { useAccount, useWalletClient } from "wagmi";

import { DonutLogo, Separator } from "@/components/ui";
import { TV } from "@/features/tv";
import { useMinerData, usePriceTicker, useGlaze } from "@/features/terminal";
import { formatEth, formatDonut, truncateAddress } from "@/lib/utils/format";
import { REBATE_PERCENTAGE } from "@/config/constants";
import { Button } from "@/components/ui";

export default function MinePage() {
  const { address: userAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const {
    minerState,
    setMinerState,
    kingProfile,
    feed,
    feedProfiles,
    stats,
    userGraphStats,
    ethPrice,
    nextHalvingTime,
  } = useMinerData(userAddress);

  const { currentPrice, now, halvingDisplay } = usePriceTicker(
    minerState.initPrice,
    minerState.startTime,
    nextHalvingTime
  );

  const { isGlazing, connectionError, message, setMessage, handleGlaze } = useGlaze(
    userAddress,
    walletClient,
    minerState,
    currentPrice,
    setMinerState
  );

  // Derived values
  const safeDps = minerState?.dps ? BigInt(minerState.dps) : 0n;
  const safeDonutPrice = minerState?.donutPrice ? BigInt(minerState.donutPrice) : 0n;
  const safeInitPrice = minerState?.initPrice ? BigInt(minerState.initPrice) : 0n;

  const elapsedSeconds = BigInt(
    Math.max(0, Math.floor(now / 1000) - Number(minerState.startTime))
  );

  const formatGlazeTime = (seconds: number): string => {
    if (seconds < 0) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const glazeTimeStr = formatGlazeTime(Number(elapsedSeconds));
  const accruedDonutsWei = elapsedSeconds * safeDps;
  const accruedDonutsStr = formatDonut(accruedDonutsWei);

  const WEI = 1000000000000000000n;
  const accruedValueWei = (accruedDonutsWei * safeDonutPrice) / WEI;
  const accruedValueEthNum = parseFloat(ethers.formatEther(accruedValueWei));
  const accruedValueUsdStr = (accruedValueEthNum * ethPrice).toFixed(2);

  // PNL Calculation
  const halfInitPrice = safeInitPrice / 2n;
  const pnlWei = (currentPrice * 80n) / 100n - halfInitPrice;
  const pnlIsPositive = pnlWei >= 0n;
  const pnlAbsWei = pnlIsPositive ? pnlWei : -pnlWei;
  const pnlEthNum = parseFloat(ethers.formatEther(pnlAbsWei));
  const pnlSign = pnlIsPositive ? "+" : "-";
  const pnlEthStr = `${pnlSign}Ξ${pnlEthNum.toFixed(5)}`;
  const pnlUsdNum = pnlEthNum * ethPrice;
  const pnlUsdSigned = pnlIsPositive ? pnlUsdNum : -pnlUsdNum;
  const pnlUsdStr = `${pnlSign}$${pnlUsdNum.toFixed(2)}`;

  // Total
  const accruedUsdNum = parseFloat(accruedValueUsdStr);
  const totalUsdNum = accruedUsdNum + pnlUsdSigned;
  const totalIsPositive = totalUsdNum >= 0;
  const totalUsdStr = `${totalIsPositive ? "+" : "-"}$${Math.abs(totalUsdNum).toFixed(2)}`;

  // Price displays
  const dpsEthWei = (safeDps * safeDonutPrice) / WEI;
  const dpsUsd = parseFloat(ethers.formatEther(dpsEthWei)) * ethPrice;
  const currentPriceEth = parseFloat(ethers.formatEther(currentPrice));
  const rebatePriceEth = currentPriceEth * REBATE_PERCENTAGE;
  const rebatePriceUsd = rebatePriceEth * ethPrice;
  const donutPriceUsd = parseFloat(ethers.formatEther(safeDonutPrice)) * ethPrice;

  return (
    <div className="pt-2">
      <div className="max-w-7xl mx-auto">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left Sidebar */}
          <div className="lg:w-72 shrink-0 flex flex-col gap-5 order-2 lg:order-1">
            <CurrentOperatorCard
              kingProfile={kingProfile}
              minerState={minerState}
              glazeTimeStr={glazeTimeStr}
              accruedDonutsStr={accruedDonutsStr}
              accruedValueUsdStr={accruedValueUsdStr}
              pnlEthStr={pnlEthStr}
              pnlUsdStr={pnlUsdStr}
              totalUsdStr={totalUsdStr}
              totalIsPositive={totalIsPositive}
            />

            <Separator />

            <GlobalMetricsCard
              stats={stats}
              donutPriceUsd={donutPriceUsd}
              halvingDisplay={halvingDisplay}
            />

            <Separator />

            <UserStatsCard
              minerState={minerState}
              userGraphStats={userGraphStats}
              ethPrice={ethPrice}
              donutPriceUsd={donutPriceUsd}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2 min-w-0">
            {/* Video */}
            <div className="relative w-full">
              <div className="aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden">
                <TV uri={minerState.uri} glazing={isGlazing} overrideAvatar={kingProfile?.pfp} />
              </div>
            </div>

            {/* Message Input */}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a message to glaze..."
              className="w-full bg-corp-900 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-corp-100 placeholder:text-corp-500 focus:outline-none focus:border-white/10 transition-colors"
              maxLength={200}
              spellCheck={false}
            />

            {/* Stats + Glaze Button */}
            <div className="flex items-stretch gap-4">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-corp-500 mb-0.5">Rate</div>
                  <div className="text-lg text-corp-50 font-semibold flex items-center gap-1.5">
                    <DonutLogo className="w-4 h-4" />
                    <span>{formatDonut(safeDps)}/s</span>
                  </div>
                  <div className="text-xs text-corp-500">${dpsUsd.toFixed(4)}/s</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-corp-500 mb-0.5">Price</div>
                  <div className="text-lg text-glaze-400 font-semibold tabular-nums">Ξ{rebatePriceEth.toFixed(5)}</div>
                  <div className="text-xs text-corp-500">${rebatePriceUsd.toFixed(2)}</div>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleGlaze}
                disabled={isGlazing || !isConnected}
                className="flex-1 !py-2.5 !text-sm !rounded-xl !font-semibold"
              >
                {isGlazing ? "..." : "Glaze"}
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activity - Full Width */}
        <Separator className="mt-4 mb-4" />
        <SurveillanceLog feed={feed} feedProfiles={feedProfiles} accruedDonutsStr={accruedDonutsStr} currentPriceEth={currentPriceEth} />
      </div>
    </div>
  );
}

function CurrentOperatorCard({
  kingProfile,
  minerState,
  glazeTimeStr,
  accruedDonutsStr,
  accruedValueUsdStr,
  pnlEthStr,
  pnlUsdStr,
  totalUsdStr,
  totalIsPositive,
}: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
        Current Operator
      </h3>

      <div className="flex items-center gap-3">
        <div className="shrink-0 relative">
          {kingProfile?.pfp ? (
            <img
              src={kingProfile.pfp}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-corp-800"
              alt=""
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-corp-800 flex items-center justify-center text-glaze-400">
              <Zap size={16} />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#131313]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-corp-100 truncate">
            {kingProfile?.displayName || truncateAddress(minerState.miner)}
          </div>
          <div className="text-xs text-corp-500 truncate">
            @{kingProfile?.username || "unknown"}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">Time</span>
          <span className="text-sm text-corp-100 tabular-nums font-medium">{glazeTimeStr}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-xs text-corp-500">Glazed</span>
          <div className="text-right">
            <div className="text-sm text-corp-100 font-medium flex items-center justify-end gap-1">
              <DonutLogo className="w-3.5 h-3.5" />
              {accruedDonutsStr}
            </div>
            <div className="text-[11px] text-corp-500">${accruedValueUsdStr}</div>
          </div>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-xs text-corp-500">PNL</span>
          <div className="text-right">
            <div className="text-sm text-corp-100 font-medium tabular-nums">
              {pnlEthStr}
            </div>
            <div className="text-[11px] text-corp-500">
              {pnlUsdStr}
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-400 font-medium">Total</span>
          <span className={`text-sm font-semibold tabular-nums ${totalIsPositive ? "text-emerald-400" : "text-red-400"}`}>
            {totalUsdStr}
          </span>
        </div>
      </div>
    </div>
  );
}

function GlobalMetricsCard({ stats, donutPriceUsd, halvingDisplay }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
        Global Stats
      </h3>

      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">Total Mined</span>
          <span className="text-sm text-corp-100 font-medium flex items-center gap-1">
            <DonutLogo className="w-3.5 h-3.5" />
            {parseFloat(stats.minted).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">Price</span>
          <span className="text-sm text-corp-100 font-medium tabular-nums">${donutPriceUsd.toFixed(6)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">Next Halving</span>
          <span className="text-sm text-corp-300 tabular-nums">{halvingDisplay}</span>
        </div>
      </div>
    </div>
  );
}

function UserStatsCard({
  minerState,
  userGraphStats,
  ethPrice,
  donutPriceUsd,
}: {
  minerState: any;
  userGraphStats: any;
  ethPrice: number;
  donutPriceUsd: number;
}) {
  const ethSpent = parseFloat(userGraphStats?.spent || "0");
  const ethEarned = parseFloat(userGraphStats?.earned || "0");
  const donutMined = parseFloat(userGraphStats?.mined || "0");

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
        Your Wallet
      </h3>

      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">DONUT</span>
          <span className="text-sm text-corp-100 font-medium flex items-center gap-1">
            <DonutLogo className="w-3.5 h-3.5" />
            {formatDonut(minerState.donutBalance)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">ETH</span>
          <span className="text-sm text-corp-100 font-medium tabular-nums">Ξ{formatEth(minerState.ethBalance, 4)}</span>
        </div>

        <Separator className="my-2" />

        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">ETH Spent</span>
          <span className="text-sm text-corp-100 font-medium tabular-nums">Ξ{ethSpent.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">ETH Earned</span>
          <span className="text-sm text-corp-100 font-medium tabular-nums">Ξ{ethEarned.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-corp-500">DONUT Mined</span>
          <span className="text-sm text-corp-100 font-medium flex items-center gap-1">
            <DonutLogo className="w-3.5 h-3.5" />
            {donutMined.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function SurveillanceLog({ feed, feedProfiles, accruedDonutsStr, currentPriceEth }: any) {
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
        Recent Activity
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-corp-500 border-b border-white/[0.06]">
              <th className="pb-3 font-medium w-8 pl-4 pr-3">#</th>
              <th className="pb-3 font-medium">User</th>
              <th className="pb-3 font-medium">Message</th>
              <th className="pb-3 font-medium text-right">Spent</th>
              <th className="pb-3 font-medium text-right">Earned</th>
              <th className="pb-3 font-medium text-right pr-4">Mined</th>
            </tr>
          </thead>
          <tbody>
            {feed.slice(0, 10).map((item: any, index: number) => {
              const minerAddr = item.miner?.toLowerCase() || "";
              const profile = minerAddr ? feedProfiles[minerAddr] : null;
              const messageContent = !item.uri || item.uri.trim().length === 0 ? "System Override" : item.uri;
              const isLive = index === 0;
              let displayPrice = "0.000";
              try {
                displayPrice = parseFloat(item.price).toFixed(3);
              } catch {}

              return (
                <tr
                  key={item.id}
                  className={`border-b border-white/[0.04] transition-colors ${
                    isLive
                      ? "bg-glaze-500/5 hover:bg-glaze-500/10"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="py-3 text-xs tabular-nums pl-4 pr-3">
                    {isLive ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-glaze-500 animate-pulse" />
                      </span>
                    ) : (
                      <span className="text-corp-600">{index + 1}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      {profile?.pfp ? (
                        <img src={profile.pfp} className="w-6 h-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-corp-800 flex items-center justify-center text-[10px] text-corp-400">
                          {truncateAddress(item.miner).slice(0, 2)}
                        </div>
                      )}
                      <span className={`text-sm font-medium ${isLive ? "text-corp-100" : "text-corp-200"}`}>
                        {profile?.username || truncateAddress(item.miner)}
                      </span>
                      {isLive && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-glaze-400 bg-glaze-500/20 px-1.5 py-0.5 rounded">
                          Live
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`py-3 text-sm max-w-[200px] truncate ${isLive ? "text-corp-300" : "text-corp-400"}`}>
                    {messageContent}
                  </td>
                  <td className={`py-3 text-sm text-right tabular-nums ${isLive ? "text-corp-100" : "text-corp-200"}`}>
                    Ξ{displayPrice}
                  </td>
                  <td className={`py-3 text-sm text-right tabular-nums ${isLive ? "text-glaze-400" : "text-corp-200"}`}>
                    {isLive ? (
                      <span>Ξ{(currentPriceEth * 0.8).toFixed(3)}</span>
                    ) : (
                      `Ξ${item.earned ? parseFloat(item.earned).toFixed(3) : "0.000"}`
                    )}
                  </td>
                  <td className={`py-3 text-sm text-right tabular-nums pr-4 ${isLive ? "text-glaze-400" : "text-corp-200"}`}>
                    <div className="flex items-center justify-end gap-1">
                      <DonutLogo className="w-3.5 h-3.5" />
                      {isLive ? (
                        <span>{accruedDonutsStr}</span>
                      ) : (
                        item.mined ? parseFloat(item.mined).toLocaleString() : "0"
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
