"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { formatUnits } from "viem";
import { Loader2 } from "lucide-react";

import {
  useGovernData,
  useVoting,
  useStaking,
  formatTimeUntilNextEpoch,
} from "@/features/govern";
import {
  PAYMENT_TOKEN_SYMBOLS,
  TOKEN_ADDRESSES,
  DONUT_DECIMALS,
} from "@/config/govern-constants";
import { getPreferredWalletConnectors, shouldTryNextConnector } from "@/lib/farcaster-wallet";

// ─── helpers ────────────────────────────────────────────────────────────────

const STRATEGY_COLORS = [
  "#f472b6", // pink
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#fb923c", // orange
  "#2dd4bf", // teal
  "#f87171", // red
];

const TOKEN_ICONS: Record<string, string> = {
  "0x4200000000000000000000000000000000000006": "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png", // WETH
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png", // USDC
  "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": "https://coin-images.coingecko.com/coins/images/40143/small/cbbtc.webp", // cbBTC
  "0x2b5050f01d64fbb3e4ac44dc07f0732bfb5ecadf": "https://coin-images.coingecko.com/coins/images/66513/small/_QR_white_circle__transparent_bg_%288%29.png", // QR
  "0x940181a94A35A4569E4529A3CDfB74e38FD98631": "https://coin-images.coingecko.com/coins/images/31745/small/token.png", // AERO
  "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb": "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/295953fa-15ed-4d3c-241d-b6c1758c6200/original", // CLANKER
  "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b": "https://coin-images.coingecko.com/coins/images/52626/small/bankr-static.png", // BNKR
};

function getTokenIcon(address: string): string | null {
  return TOKEN_ICONS[address.toLowerCase()] ?? TOKEN_ICONS[address] ?? null;
}

function formatTokenAmount(value: bigint, decimals: number): string {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  if (num > 0) return num.toFixed(6);
  return "0";
}

function formatGDonut(value: bigint): string {
  return formatTokenAmount(value, DONUT_DECIMALS);
}

function formatDonut(value: bigint): string {
  return formatTokenAmount(value, DONUT_DECIMALS);
}

function getTokenSymbol(address: string): string {
  return PAYMENT_TOKEN_SYMBOLS[address.toLowerCase()] ?? "???";
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  valueClass,
  action,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium tabular-nums font-mono ${valueClass ?? ""}`}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────────────────────

export default function VotePage() {
  // Force scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();

  // State
  const [stakeMode, setStakeMode] = useState<"stake" | "unstake">("stake");
  const [stakeAmount, setStakeAmount] = useState("");

  // Hooks
  const {
    voterData,
    bribesData,
    strategiesData,
    donutAllowance,
    hasVotingPower,
    hasActiveVotes,
    canVote,
    canUnstake,
    totalPendingRewards,
    allBribeAddresses,
    refetchAll,
  } = useGovernData(address);

  const {
    txStep: voteTxStep,
    txResult: voteTxResult,
    isBusy: isVoteBusy,
    voteWeights,
    setVoteWeights,
    totalVoteWeight,
    handleVote,
    handleReset,
    handleClaimBribes,
  } = useVoting(address, refetchAll);

  const {
    txStep: stakeTxStep,
    txResult: stakeTxResult,
    isBusy: isStakeBusy,
    needsApproval,
    handleApproveAndStake,
    handleStake,
    handleUnstake,
  } = useStaking(address, donutAllowance, refetchAll);

  // Derived
  const donutBalance = voterData?.accountUnderlyingTokenBalance ?? 0n;
  const gDonutBalance = voterData?.accountGovernanceTokenBalance ?? 0n;
  const usedWeights = voterData?.accountUsedWeights ?? 0n;
  const lastVoted = voterData?.accountLastVoted ?? 0n;

  const maxStakeAmount = useMemo(() => {
    if (stakeMode === "stake") {
      return formatUnits(donutBalance, DONUT_DECIMALS);
    }
    return formatUnits(gDonutBalance, DONUT_DECIMALS);
  }, [stakeMode, donutBalance, gDonutBalance]);

  const handleConnect = async () => {
    let lastError: unknown;

    for (const connector of getPreferredWalletConnectors(connectors, { preferFarcaster: true })) {
      try {
        await connectAsync({ connector });
        return;
      } catch (e) {
        lastError = e;
        if (!shouldTryNextConnector(connector, e)) break;
      }
    }

    if (lastError) {
      console.error("Connect failed:", lastError);
    }
  };

  const handleStakeAction = useCallback(() => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    if (stakeMode === "stake") {
      if (needsApproval(stakeAmount)) {
        handleApproveAndStake(stakeAmount);
      } else {
        handleStake(stakeAmount);
      }
    } else {
      handleUnstake(stakeAmount);
    }
    setStakeAmount("");
  }, [
    stakeAmount,
    stakeMode,
    needsApproval,
    handleApproveAndStake,
    handleStake,
    handleUnstake,
  ]);

  const handleSetMax = () => {
    setStakeAmount(maxStakeAmount);
  };

  const handleVoteWeightChange = (strategy: string, value: string) => {
    const num = parseInt(value) || 0;
    setVoteWeights((prev) => ({
      ...prev,
      [strategy]: Math.max(0, Math.min(100, num)),
    }));
  };

  const stakeButtonLabel = useMemo(() => {
    if (isStakeBusy) {
      if (stakeTxStep === "approving") return "Approving...";
      if (stakeTxStep === "staking") return "Staking...";
      if (stakeTxStep === "unstaking") return "Unstaking...";
      return "Processing...";
    }
    if (stakeMode === "stake") {
      if (stakeAmount && needsApproval(stakeAmount))
        return "Approve & Stake";
      return "Stake DONUT";
    }
    return "Unstake gDONUT";
  }, [isStakeBusy, stakeTxStep, stakeMode, stakeAmount, needsApproval]);

  const voteButtonLabel = useMemo(() => {
    if (isVoteBusy) {
      if (voteTxStep === "voting") return "Voting...";
      if (voteTxStep === "resetting") return "Resetting...";
      if (voteTxStep === "claiming") return "Claiming...";
      return "Processing...";
    }
    if (isConnected && hasVotingPower && !canVote) {
      return `Vote in ${formatTimeUntilNextEpoch(lastVoted)}`;
    }
    return "Vote";
  }, [isVoteBusy, voteTxStep, isConnected, hasVotingPower, canVote, lastVoted]);

  // ─── render ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background">
      <div
        className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 76px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <div className="lg:pt-[88px]">
          {/* ── page header (desktop only) ────────────────────────── */}
          <div className="hidden lg:block mb-6">
            <h1 className="font-display text-[2.75rem] font-semibold leading-[0.9] tracking-[-0.04em]">
              Vote
            </h1>
            <p className="page-subtitle">
              Stake DONUT, allocate votes to strategies, and earn protocol
              revenue.
            </p>
          </div>

          {/* ── MOBILE LAYOUT ─────────────────────────────────────── */}
          <div className="lg:hidden space-y-4">
            {/* Stake Card */}
            <StakeCard
              isConnected={isConnected}
              stakeMode={stakeMode}
              setStakeMode={setStakeMode}
              stakeAmount={stakeAmount}
              setStakeAmount={setStakeAmount}
              maxStakeAmount={maxStakeAmount}
              handleSetMax={handleSetMax}
              handleStakeAction={handleStakeAction}
              handleReset={handleReset}
              handleConnect={handleConnect}
              isStakeBusy={isStakeBusy}
              stakeButtonLabel={stakeButtonLabel}
              stakeTxStep={stakeTxStep}
              stakeTxResult={stakeTxResult}
              canUnstake={canUnstake}
              canVote={canVote}
              lastVoted={lastVoted}
              stakeMode_={stakeMode}
            />

            {/* Your Position */}
            {isConnected && (
              <PositionCard
                gDonutBalance={gDonutBalance}
                usedWeights={usedWeights}
                lastVoted={lastVoted}
                totalPendingRewards={totalPendingRewards}
                allBribeAddresses={allBribeAddresses}
                handleClaimBribes={handleClaimBribes}
                isVoteBusy={isVoteBusy}
                voteTxStep={voteTxStep}
              />
            )}

            {/* Strategies */}
            <StrategiesCard
              isConnected={isConnected}
              bribesData={bribesData}
              strategiesData={strategiesData}
              voteWeights={voteWeights}
              totalVoteWeight={totalVoteWeight}
              handleVoteWeightChange={handleVoteWeightChange}
              handleVote={handleVote}
              handleReset={handleReset}
              isVoteBusy={isVoteBusy}
              voteButtonLabel={voteButtonLabel}
              voteTxResult={voteTxResult}
              hasVotingPower={hasVotingPower}
              canVote={canVote}
              hasActiveVotes={hasActiveVotes}
              lastVoted={lastVoted}
              gDonutBalance={gDonutBalance}
            />
          </div>

          {/* ── DESKTOP LAYOUT ────────────────────────────────────── */}
          <div className="hidden lg:flex gap-6">
            {/* Left column */}
            <div className="w-[380px] shrink-0 space-y-4">
              <StakeCard
                isConnected={isConnected}
                stakeMode={stakeMode}
                setStakeMode={setStakeMode}
                stakeAmount={stakeAmount}
                setStakeAmount={setStakeAmount}
                maxStakeAmount={maxStakeAmount}
                handleSetMax={handleSetMax}
                handleStakeAction={handleStakeAction}
                handleReset={handleReset}
                handleConnect={handleConnect}
                isStakeBusy={isStakeBusy}
                stakeButtonLabel={stakeButtonLabel}
                stakeTxStep={stakeTxStep}
                stakeTxResult={stakeTxResult}
                canUnstake={canUnstake}
                canVote={canVote}
                lastVoted={lastVoted}
                stakeMode_={stakeMode}
              />

              {isConnected && (
                <PositionCard
                  gDonutBalance={gDonutBalance}
                  usedWeights={usedWeights}
                  lastVoted={lastVoted}
                  totalPendingRewards={totalPendingRewards}
                  allBribeAddresses={allBribeAddresses}
                  handleClaimBribes={handleClaimBribes}
                  isVoteBusy={isVoteBusy}
                  voteTxStep={voteTxStep}
                />
              )}
            </div>

            {/* Right column */}
            <div className="flex-1 min-w-0">
              <StrategiesCard
                isConnected={isConnected}
                bribesData={bribesData}
                strategiesData={strategiesData}
                voteWeights={voteWeights}
                totalVoteWeight={totalVoteWeight}
                handleVoteWeightChange={handleVoteWeightChange}
                handleVote={handleVote}
                handleReset={handleReset}
                isVoteBusy={isVoteBusy}
                voteButtonLabel={voteButtonLabel}
                voteTxResult={voteTxResult}
                hasVotingPower={hasVotingPower}
                canVote={canVote}
                hasActiveVotes={hasActiveVotes}
                lastVoted={lastVoted}
                gDonutBalance={gDonutBalance}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── STAKE CARD ─────────────────────────────────────────────────────────────

function StakeCard({
  isConnected,
  stakeMode,
  setStakeMode,
  stakeAmount,
  setStakeAmount,
  maxStakeAmount,
  handleSetMax,
  handleStakeAction,
  handleReset,
  handleConnect,
  isStakeBusy,
  stakeButtonLabel,
  stakeTxStep,
  stakeTxResult,
  canUnstake,
  canVote,
  lastVoted,
  stakeMode_,
}: {
  isConnected: boolean;
  stakeMode: "stake" | "unstake";
  setStakeMode: (m: "stake" | "unstake") => void;
  stakeAmount: string;
  setStakeAmount: (v: string) => void;
  maxStakeAmount: string;
  handleSetMax: () => void;
  handleStakeAction: () => void;
  handleReset: () => void;
  handleConnect: () => void;
  isStakeBusy: boolean;
  stakeButtonLabel: string;
  stakeTxStep: string;
  stakeTxResult: "success" | "failure" | null;
  canUnstake: boolean | null;
  canVote: boolean | null;
  lastVoted: bigint;
  stakeMode_: "stake" | "unstake";
}) {
  return (
    <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
      <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">
        Stake
      </div>
      <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">
        Lock DONUT to earn voting power.
      </p>

      {/* Toggle buttons */}
      <div className="flex gap-2 mb-4">
        <button
          className={`flex-1 px-3 py-2 rounded-[var(--radius)] text-[13px] font-semibold font-display transition-all ${
            stakeMode === "stake"
              ? "bg-primary text-primary-foreground"
              : "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setStakeMode("stake")}
        >
          Stake
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-[var(--radius)] text-[13px] font-semibold font-display transition-all ${
            stakeMode === "unstake"
              ? "bg-primary text-primary-foreground"
              : "bg-[hsl(var(--foreground)/0.06)] text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setStakeMode("unstake")}
        >
          Unstake
        </button>
      </div>

      {/* Amount input */}
      <div className="relative mb-4">
        <input
          type="text"
          inputMode="decimal"
          className="field-input w-full pr-16"
          placeholder={
            stakeMode === "stake" ? "DONUT amount" : "gDONUT amount"
          }
          value={stakeAmount}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[0-9]*\.?[0-9]*$/.test(v)) setStakeAmount(v);
          }}
          disabled={isStakeBusy || !isConnected}
          spellCheck={false}
        />
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-primary hover:underline"
          onClick={handleSetMax}
          disabled={isStakeBusy || !isConnected}
        >
          MAX
        </button>
      </div>

      {/* Balance display */}
      <div className="text-[11px] text-muted-foreground mb-4 tabular-nums font-mono">
        Balance:{" "}
        <span className="text-foreground">
          {parseFloat(maxStakeAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
          {stakeMode === "stake" ? "DONUT" : "gDONUT"}
        </span>
      </div>

      {/* Action button */}
      {isConnected ? (
        stakeMode === "unstake" && !canUnstake ? (
          /* Show reset button instead of unstake when votes are active */
          <div className="space-y-2">
            <button
              className="slab-button w-full text-sm font-semibold"
              onClick={handleReset}
              disabled={isStakeBusy || !canVote}
            >
              {isStakeBusy && stakeTxStep === "resetting" ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting...
                </span>
              ) : !canVote ? (
                `Reset available ${formatTimeUntilNextEpoch(lastVoted)}`
              ) : (
                "Reset Votes to Unstake"
              )}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              1 action per epoch — vote or reset. Active votes lock your gDONUT.
            </p>
          </div>
        ) : (
          <button
            className="slab-button w-full text-sm font-semibold"
            onClick={handleStakeAction}
            disabled={
              isStakeBusy ||
              !stakeAmount ||
              parseFloat(stakeAmount) <= 0
            }
          >
            {isStakeBusy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {stakeButtonLabel}
              </span>
            ) : (
              stakeButtonLabel
            )}
          </button>
        )
      ) : (
        <button
          className="slab-button w-full text-sm font-semibold"
          onClick={handleConnect}
        >
          Connect Wallet
        </button>
      )}

      {/* Transaction result */}
      {stakeTxResult === "success" && (
        <div className="mt-3 p-3 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[12px] text-emerald-400">
            Transaction confirmed.
          </p>
        </div>
      )}
      {stakeTxResult === "failure" && (
        <div className="mt-3 p-3 rounded-[var(--radius)] bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)]">
          <p className="text-[12px] text-[hsl(var(--destructive))]">
            Transaction failed.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── POSITION CARD ──────────────────────────────────────────────────────────

function PositionCard({
  gDonutBalance,
  usedWeights,
  lastVoted,
  totalPendingRewards,
  allBribeAddresses,
  handleClaimBribes,
  isVoteBusy,
  voteTxStep,
}: {
  gDonutBalance: bigint;
  usedWeights: bigint;
  lastVoted: bigint;
  totalPendingRewards: { token: `0x${string}`; decimals: number; amount: bigint }[];
  allBribeAddresses: `0x${string}`[];
  handleClaimBribes: (addresses: `0x${string}`[]) => void;
  isVoteBusy: boolean;
  voteTxStep: string;
}) {
  const hasRewards = totalPendingRewards.length > 0;

  return (
    <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
      <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">
        Your Position
      </div>
      <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">
        Voting power and pending rewards.
      </p>

      <div className="space-y-2.5">
        <StatRow
          label="Voting Power"
          value={`${formatGDonut(gDonutBalance)} gDONUT`}
        />
        <StatRow
          label="Active Voting Power"
          value={`${formatGDonut(usedWeights)} gDONUT`}
        />
        <StatRow
          label="Next Vote"
          value={formatTimeUntilNextEpoch(lastVoted)}
        />

        <div className="border-t border-[hsl(var(--foreground)/0.1)] my-2" />

        {/* Pending rewards */}
        <div className="flex justify-between items-start">
          <span className="text-xs text-muted-foreground">Pending Rewards</span>
          <div className="text-right">
            {hasRewards ? (
              <div className="space-y-0.5">
                {totalPendingRewards.map((r) => (
                  <div
                    key={r.token}
                    className="text-sm font-medium tabular-nums font-mono text-emerald-400"
                  >
                    +{formatTokenAmount(r.amount, r.decimals)}{" "}
                    {getTokenSymbol(r.token)}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm font-medium tabular-nums font-mono text-muted-foreground">
                --
              </span>
            )}
          </div>
        </div>

        {hasRewards && (
          <button
            className="slab-button w-full text-sm font-semibold mt-2"
            onClick={() => handleClaimBribes(allBribeAddresses)}
            disabled={isVoteBusy}
          >
            {isVoteBusy && voteTxStep === "claiming" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Claiming...
              </span>
            ) : (
              "Claim Rewards"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── STRATEGIES CARD ────────────────────────────────────────────────────────

function StrategiesCard({
  isConnected,
  bribesData,
  strategiesData,
  voteWeights,
  totalVoteWeight,
  handleVoteWeightChange,
  handleVote,
  handleReset,
  isVoteBusy,
  voteButtonLabel,
  voteTxResult,
  hasVotingPower,
  canVote,
  hasActiveVotes,
  lastVoted,
  gDonutBalance,
}: {
  isConnected: boolean;
  bribesData: ReturnType<typeof useGovernData>["bribesData"];
  strategiesData: ReturnType<typeof useGovernData>["strategiesData"];
  voteWeights: Record<string, number>;
  totalVoteWeight: number;
  handleVoteWeightChange: (strategy: string, value: string) => void;
  handleVote: () => void;
  handleReset: () => void;
  isVoteBusy: boolean;
  voteButtonLabel: string;
  voteTxResult: "success" | "failure" | null;
  hasVotingPower: boolean | null;
  canVote: boolean | null;
  hasActiveVotes: boolean | null;
  lastVoted: bigint;
  gDonutBalance: bigint;
}) {
  // Build merged strategy rows from bribes + strategies
  const strategyRows = useMemo(() => {
    return bribesData.map((bribe, idx) => {
      const strategy = strategiesData.find(
        (s) => s.strategy.toLowerCase() === bribe.strategy.toLowerCase()
      );
      const paymentToken = strategy?.paymentToken ?? "";
      const paymentSymbol = strategy
        ? getTokenSymbol(strategy.paymentToken)
        : "???";

      // Calculate earned from bribe rewards (use first reward token with non-zero earned)
      let earnedStr = "--";
      let earnedSymbol = paymentSymbol;
      for (let i = 0; i < bribe.accountRewardsEarned.length; i++) {
        const earned = bribe.accountRewardsEarned[i] ?? 0n;
        if (earned > 0n) {
          const decimals = bribe.rewardTokenDecimals[i] ?? 18;
          earnedStr = formatTokenAmount(earned, decimals);
          // Use reward token symbol if available
          if (bribe.rewardTokens?.[i]) {
            earnedSymbol = getTokenSymbol(bribe.rewardTokens[i]);
          }
          break;
        }
      }

      // votePercent is uint256 with 18 decimals (1e18 = 100%)
      const votePercentDisplay = Number(bribe.votePercent) / 1e18;

      return {
        strategy: bribe.strategy,
        color: STRATEGY_COLORS[idx % STRATEGY_COLORS.length],
        symbol: paymentSymbol,
        paymentToken,
        votePercent: votePercentDisplay,
        earned: earnedStr,
        earnedSymbol,
        accountVote: Number(bribe.accountVote),
        userVotePercent: gDonutBalance > 0n
          ? (Number(bribe.accountVote) / Number(gDonutBalance)) * 100
          : 0,
        weight: voteWeights[bribe.strategy] ?? 0,
      };
    });
  }, [bribesData, strategiesData, voteWeights]);

  return (
    <div className="slab-panel rounded-[var(--radius)] px-3 py-4">
      <div className="font-semibold text-[18px] font-display tracking-[-0.03em]">
        Strategies
      </div>
      <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">
        Allocate votes to earn protocol revenue.
      </p>

      {strategyRows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-[13px]">
          Loading strategies...
        </div>
      ) : (
        <>
          {/* Strategy rows */}
          <div className="space-y-1">
            {strategyRows.map((row) => {
              const isDonut = row.paymentToken.toLowerCase() === TOKEN_ADDRESSES.donut.toLowerCase();
              const isDonutEthLp = row.paymentToken.toLowerCase() === TOKEN_ADDRESSES.donutEthLp.toLowerCase();
              const iconUrl = getTokenIcon(row.paymentToken);

              return (
                <div
                  key={row.strategy}
                  className="grid grid-cols-[44px_1fr_55px_50px] gap-x-2 items-center px-1 py-2.5 rounded-[var(--radius)] hover:bg-[hsl(var(--foreground)/0.03)] transition-colors"
                >
                  {/* Token icon */}
                  <div className="flex items-center shrink-0">
                    {isDonutEthLp ? (
                      <div className="flex items-center -space-x-1.5">
                        <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0 z-[1]">
                          <circle cx="16" cy="16" r="16" fill="#f472b6" />
                          <circle cx="16" cy="16" r="6" fill="hsl(var(--background))" />
                        </svg>
                        <img
                          src={TOKEN_ICONS["0x4200000000000000000000000000000000000006"]}
                          alt="ETH"
                          className="w-8 h-8 rounded-full shrink-0"
                        />
                      </div>
                    ) : isDonut ? (
                      <svg viewBox="0 0 32 32" className="w-7 h-7">
                        <circle cx="16" cy="16" r="16" fill="#f472b6" />
                        <circle cx="16" cy="16" r="6" fill="hsl(var(--background))" />
                      </svg>
                    ) : iconUrl ? (
                      <img
                        src={iconUrl}
                        alt={row.symbol}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: row.color + "33" }}
                      />
                    )}
                  </div>

                  {/* Symbol + Earned stacked */}
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">
                      {row.symbol}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums font-mono truncate">
                      {row.earned === "--" ? (
                        "Earned: --"
                      ) : (
                        `Earned: ${row.earned}`
                      )}
                    </div>
                  </div>

                  {/* Vote % + user badge */}
                  <div className="text-right">
                    <div className="text-[13px] tabular-nums font-mono">
                      {row.votePercent.toFixed(1)}%
                    </div>
                    {row.userVotePercent > 0 && (
                      <div className="text-[10px] tabular-nums font-mono text-primary">
                        You: {row.userVotePercent.toFixed(0)}%
                      </div>
                    )}
                  </div>

                  {/* Weight input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full text-right text-[13px] tabular-nums font-mono bg-[hsl(var(--foreground)/0.06)] border border-[hsl(var(--foreground)/0.08)] rounded-[var(--radius)] px-2 py-1.5 focus:outline-none focus:border-primary/50"
                      value={row.weight || ""}
                      placeholder="0"
                      onChange={(e) =>
                        handleVoteWeightChange(row.strategy, e.target.value)
                      }
                      disabled={isVoteBusy || !isConnected}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total footer */}
          <div className="border-t border-[hsl(var(--foreground)/0.1)] mt-3 pt-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Weight
              </span>
              <span
                className={`text-sm font-semibold tabular-nums font-mono ${
                  totalVoteWeight > 100
                    ? "text-red-400"
                    : totalVoteWeight > 0
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {totalVoteWeight}%
              </span>
            </div>
          </div>

          {/* Vote button */}
          <div className="flex gap-2 mt-4">
            <button
              className="slab-button flex-1 text-sm font-semibold"
              onClick={handleVote}
              disabled={
                isVoteBusy ||
                !isConnected ||
                totalVoteWeight === 0 ||
                totalVoteWeight > 100 ||
                !hasVotingPower ||
                !canVote
              }
            >
              {isVoteBusy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {voteButtonLabel}
                </span>
              ) : (
                voteButtonLabel
              )}
            </button>
          </div>

          {/* Cannot vote message */}
          {isConnected && !canVote && hasVotingPower && (
            <div className="mt-3 p-3 rounded-[var(--radius)] bg-[hsl(var(--foreground)/0.04)]">
              <p className="text-[11px] text-muted-foreground">
                Already voted this epoch. Next vote:{" "}
                {formatTimeUntilNextEpoch(lastVoted)}
              </p>
            </div>
          )}

          {isConnected && !hasVotingPower && (
            <div className="mt-3 p-3 rounded-[var(--radius)] bg-[hsl(var(--foreground)/0.04)]">
              <p className="text-[11px] text-muted-foreground">
                Stake DONUT to get voting power.
              </p>
            </div>
          )}

          {/* Transaction result */}
          {voteTxResult === "success" && (
            <div className="mt-3 p-3 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[12px] text-emerald-400">
                Transaction confirmed.
              </p>
            </div>
          )}
          {voteTxResult === "failure" && (
            <div className="mt-3 p-3 rounded-[var(--radius)] bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)]">
              <p className="text-[12px] text-[hsl(var(--destructive))]">
                Transaction failed.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
