"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Zap, Hammer } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, zeroAddress } from "viem";
import type { Address } from "viem";
import { base } from "wagmi/chains";

import { Button, Separator } from "@/components/ui";
import { getRig, getRigEpochs, type SubgraphRig, type SubgraphEpoch, ipfsToHttp, fetchRigMetadata } from "@/lib/api/launchpad";
import { useRigState } from "@/features/franchise/hooks/useRigState";
import { useMineRig } from "@/features/franchise/hooks/useMineRig";
import { truncateAddress } from "@/lib/utils/format";
import { fetchFarcasterProfile, fetchFarcasterProfiles } from "@/lib/api/farcaster";
import { fetchEthPrice } from "@/lib/api/price";
import { MULTICALL_ABI, MULTICALL_ADDRESS } from "@/lib/blockchain/contracts";
import type { FarcasterProfile } from "@/types";

const formatEthValue = (value: bigint, decimals = 18) => {
  const num = Number(formatUnits(value, decimals));
  return num.toFixed(5);
};

const formatToken = (value: bigint) => {
  const num = Number(formatUnits(value, 18));
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

// Token icon component - shows rig image or symbol fallback
function TokenIcon({ imageUrl, symbol, size = "sm" }: { imageUrl: string | null; symbol: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={symbol}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-corp-700 flex items-center justify-center text-[8px] font-bold text-corp-300`}>
      {symbol?.slice(0, 2) || "?"}
    </div>
  );
}

export default function RigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address: userAddress } = useAccount();

  const [rig, setRig] = useState<SubgraphRig | null>(null);
  const [isLoadingRig, setIsLoadingRig] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mineMessage, setMineMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [minerProfile, setMinerProfile] = useState<FarcasterProfile | null>(null);
  const [epochs, setEpochs] = useState<SubgraphEpoch[]>([]);
  const [epochProfiles, setEpochProfiles] = useState<Record<string, FarcasterProfile>>({});
  const [ethPriceUsd, setEthPriceUsd] = useState(0);
  const fetchedAddressesRef = useRef<Set<string>>(new Set());

  const rigAddress = params.address as string;

  // Fetch donut price from miner multicall
  const { data: minerState } = useReadContract({
    address: MULTICALL_ADDRESS,
    abi: MULTICALL_ABI,
    functionName: "getMiner",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: 30_000 },
  });

  const donutPriceInEth = (minerState as { donutPrice?: bigint } | undefined)?.donutPrice ?? 0n;

  // Fetch ETH price
  useEffect(() => {
    fetchEthPrice().then(setEthPriceUsd);
    const interval = setInterval(() => fetchEthPrice().then(setEthPriceUsd), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rig data
  useEffect(() => {
    const fetchRigData = async () => {
      if (!rigAddress) return;
      setIsLoadingRig(true);
      const fetchedRig = await getRig(rigAddress);
      setRig(fetchedRig);

      if (fetchedRig?.uri) {
        const metadata = await fetchRigMetadata(fetchedRig.uri);
        if (metadata?.image) {
          setImageUrl(ipfsToHttp(metadata.image));
        }
      }

      // Fetch epochs for this rig
      const rigEpochs = await getRigEpochs(rigAddress, 10);
      setEpochs(rigEpochs);

      setIsLoadingRig(false);
    };
    fetchRigData();
  }, [rigAddress]);

  const { rigState, rigInfo, refetch, isLoading: isLoadingState } = useRigState(rig);

  const { mineStep, mineResult, isBusy: isMining, handleMine } = useMineRig(
    rigAddress as Address | undefined,
    userAddress,
    rigState,
    refetch
  );

  // Fetch miner profile when miner changes
  useEffect(() => {
    const loadMinerProfile = async () => {
      if (rigState?.miner && rigState.miner !== "0x0000000000000000000000000000000000000000") {
        const profile = await fetchFarcasterProfile(rigState.miner);
        setMinerProfile(profile);
      }
    };
    loadMinerProfile();
  }, [rigState?.miner]);

  // Fetch profiles for epoch accounts
  useEffect(() => {
    const loadProfiles = async () => {
      const addressesToFetch = epochs
        .map((e) => e.account?.toLowerCase())
        .filter((addr): addr is string => !!addr && !fetchedAddressesRef.current.has(addr));

      if (addressesToFetch.length > 0) {
        addressesToFetch.forEach((addr) => fetchedAddressesRef.current.add(addr));
        const newProfiles = await fetchFarcasterProfiles(addressesToFetch);
        setEpochProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    };
    if (epochs.length > 0) loadProfiles();
  }, [epochs]);

  // Calculate time-based values
  const elapsedSeconds = useMemo(() => {
    if (!rigState) return 0n;
    return BigInt(Math.max(0, Math.floor(now / 1000) - Number(rigState.epochStartTime)));
  }, [rigState, now]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const glazeTimeStr = formatTime(Number(elapsedSeconds));

  // Accrued tokens calculation
  const accruedTokens = useMemo(() => {
    if (!rigState) return 0n;
    return elapsedSeconds * rigState.ups;
  }, [elapsedSeconds, rigState]);

  const accruedTokensStr = formatToken(accruedTokens);

  // Token price and USD values
  // unitPrice is in DONUT, so we need: tokenPriceUsd = unitPrice * donutPriceUsd
  const donutPriceUsd = Number(formatUnits(donutPriceInEth, 18)) * ethPriceUsd;
  const tokenPriceInDonut = rigState ? Number(formatUnits(rigState.unitPrice, 18)) : 0;
  const tokenPriceUsd = tokenPriceInDonut * donutPriceUsd;

  const accruedValueUsd = Number(formatUnits(accruedTokens, 18)) * tokenPriceUsd;

  // PNL calculation (price is in ETH - the mining price)
  const currentPriceEth = rigState ? Number(formatUnits(rigState.price, 18)) : 0;
  const initPriceEth = rigState ? Number(formatUnits(rigState.initPrice, 18)) : 0;
  const pnlEth = (currentPriceEth * 0.8) - (initPriceEth / 2);
  const pnlIsPositive = pnlEth >= 0;
  const pnlUsd = Math.abs(pnlEth) * ethPriceUsd;

  // Total
  const totalUsd = accruedValueUsd + (pnlIsPositive ? pnlUsd : -pnlUsd);
  const totalIsPositive = totalUsd >= 0;

  // Next epoch countdown
  const getNextEpochDisplay = () => {
    if (!rigState) return "-";
    const nowSec = BigInt(Math.floor(now / 1000));
    const elapsed = nowSec - rigState.epochStartTime;
    const epochDuration = 3600n;
    const remaining = epochDuration - (elapsed % epochDuration);
    const minutes = Number(remaining / 60n);
    const seconds = Number(remaining % 60n);
    return `${minutes}m ${seconds}s`;
  };

  // Mine button
  const getButtonText = () => {
    if (mineResult === "success") return "Success!";
    if (mineResult === "failure") return "Failed";
    if (mineStep === "mining") return "Mining...";
    if (mineStep === "confirming") return "Confirming...";
    if (!userAddress) return "Connect Wallet";
    return "Mine";
  };

  const canMine = userAddress && rigState && rigState.ethBalance >= rigState.price;

  if (isLoadingRig) {
    return (
      <div className="pt-2">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-[60vh]">
          <div className="text-corp-500 text-sm">Loading rig...</div>
        </div>
      </div>
    );
  }

  if (!rig) {
    return (
      <div className="pt-2">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="text-corp-500 text-sm">Rig not found</div>
          <Button variant="secondary" onClick={() => router.push("/franchise")}>
            <ArrowLeft size={14} className="mr-2" />
            Back to Explore
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/franchise")}
          className="flex items-center gap-2 text-corp-500 hover:text-corp-300 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          <span className="text-xs font-medium">Back to Explore</span>
        </button>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Left Sidebar */}
          <div className="lg:w-72 shrink-0 flex flex-col gap-5 order-2 lg:order-1">

            {/* Current Miner Card */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
                Current Miner
              </h3>

              <div className="flex items-center gap-3">
                <div className="shrink-0 relative">
                  {minerProfile?.pfp ? (
                    <img
                      src={minerProfile.pfp}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-corp-800"
                      alt=""
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-corp-800 flex items-center justify-center text-glaze-400">
                      <Zap size={16} />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-glaze-500 rounded-full ring-2 ring-[#131313]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-corp-100 truncate">
                    {minerProfile?.displayName || (rigState?.miner ? truncateAddress(rigState.miner) : "No miner")}
                  </div>
                  <div className="text-xs text-corp-500 truncate">
                    @{minerProfile?.username || "unknown"}
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
                      <TokenIcon imageUrl={imageUrl} symbol={rig.symbol} />
                      {accruedTokensStr}
                    </div>
                    <div className="text-[11px] text-corp-500">${accruedValueUsd.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-corp-500">PNL</span>
                  <div className="text-right">
                    <div className="text-sm text-corp-100 font-medium tabular-nums">
                      {pnlIsPositive ? "+" : "-"}Ξ{Math.abs(pnlEth).toFixed(5)}
                    </div>
                    <div className="text-[11px] text-corp-500">
                      {pnlIsPositive ? "+" : "-"}${pnlUsd.toFixed(2)}
                    </div>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-400 font-medium">Total</span>
                  <span className={`text-sm font-semibold tabular-nums ${totalIsPositive ? "text-glaze-400" : "text-red-400"}`}>
                    {totalIsPositive ? "+" : "-"}${Math.abs(totalUsd).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Rig Stats Card */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
                Rig Stats
              </h3>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">Total Mined</span>
                  <span className="text-sm text-corp-100 font-medium flex items-center gap-1">
                    <TokenIcon imageUrl={imageUrl} symbol={rig.symbol} />
                    {rig.minted ? parseFloat(rig.minted).toLocaleString() : "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">Price</span>
                  <span className="text-sm text-corp-100 font-medium tabular-nums">${tokenPriceUsd.toFixed(6)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">Next Epoch</span>
                  <span className="text-sm text-corp-300 tabular-nums">{getNextEpochDisplay()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Your Wallet Card */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-corp-500">
                Your Wallet
              </h3>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">{rig.symbol}</span>
                  <span className="text-sm text-corp-100 font-medium flex items-center gap-1">
                    <TokenIcon imageUrl={imageUrl} symbol={rig.symbol} />
                    {rigState ? formatToken(rigState.unitBalance) : "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">ETH</span>
                  <span className="text-sm text-corp-100 font-medium tabular-nums">Ξ{rigState ? formatEthValue(rigState.ethBalance, 18) : "0.0000"}</span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">ETH Spent</span>
                  <span className="text-sm text-corp-100 font-medium tabular-nums">Ξ0.0000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">ETH Earned</span>
                  <span className="text-sm text-corp-100 font-medium tabular-nums">Ξ0.0000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-corp-500">{rig.symbol} Mined</span>
                  <span className="text-sm text-corp-100 font-medium flex items-center gap-1">
                    <TokenIcon imageUrl={imageUrl} symbol={rig.symbol} />
                    0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2 min-w-0">
            {/* Rig Image */}
            <div className="relative w-full">
              <div className="aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={rig.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-glaze-500/10 to-corp-900">
                    <span className="text-6xl font-bold text-glaze-400/30">
                      {rig.symbol?.slice(0, 2) || "?"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <input
              type="text"
              value={mineMessage}
              onChange={(e) => setMineMessage(e.target.value)}
              placeholder="Enter a message to mine..."
              className="w-full bg-corp-900 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-corp-100 placeholder:text-corp-500 focus:outline-none focus:border-white/10 transition-colors"
              maxLength={200}
              spellCheck={false}
            />

            {/* Stats + Mine Button */}
            <div className="flex items-stretch gap-4">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-corp-500 mb-0.5">Rate</div>
                  <div className="text-lg text-corp-50 font-semibold flex items-center gap-1.5">
                    <TokenIcon imageUrl={imageUrl} symbol={rig.symbol} size="md" />
                    <span>{rigState ? formatToken(rigState.ups) : "-"}/s</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-corp-500 mb-0.5">Mine Price</div>
                  <div className="text-lg text-glaze-400 font-semibold tabular-nums">
                    Ξ{currentPriceEth.toFixed(5)}
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => handleMine(mineMessage)}
                disabled={isMining || !canMine}
                className="flex-1 !py-2.5 !text-sm !rounded-xl !font-semibold"
              >
                <Hammer size={16} className="mr-2" />
                {getButtonText()}
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <Separator className="mt-6 mb-4" />
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
                {epochs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-corp-500 text-sm">
                      No activity yet
                    </td>
                  </tr>
                ) : (
                  epochs.slice(0, 10).map((epoch, index) => {
                    const accountAddr = epoch.account?.toLowerCase() || "";
                    const profile = accountAddr ? epochProfiles[accountAddr] : null;
                    const messageContent = !epoch.uri || epoch.uri.trim().length === 0 ? "System Override" : epoch.uri;
                    const isLive = index === 0;

                    return (
                      <tr
                        key={epoch.id}
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
                                {epoch.account ? truncateAddress(epoch.account).slice(0, 2) : "??"}
                              </div>
                            )}
                            <span className={`text-sm font-medium ${isLive ? "text-corp-100" : "text-corp-200"}`}>
                              {profile?.username || (epoch.account ? truncateAddress(epoch.account) : "Unknown")}
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
                          Ξ{parseFloat(isLive ? (epoch.initPrice || "0") : (epoch.spent || "0")).toFixed(4)}
                        </td>
                        <td className={`py-3 text-sm text-right tabular-nums ${isLive ? "text-glaze-400" : "text-corp-200"}`}>
                          {isLive ? (
                            <span>Ξ{(currentPriceEth * 0.8).toFixed(4)}</span>
                          ) : (
                            `Ξ${parseFloat(epoch.earned || "0").toFixed(4)}`
                          )}
                        </td>
                        <td className={`py-3 text-sm text-right tabular-nums pr-4 ${isLive ? "text-glaze-400" : "text-corp-200"}`}>
                          <div className="flex items-center justify-end gap-1">
                            <TokenIcon imageUrl={imageUrl} symbol={rig.symbol} />
                            {isLive ? (
                              <span>{accruedTokensStr}</span>
                            ) : (
                              epoch.mined ? parseFloat(epoch.mined).toLocaleString() : "0"
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
