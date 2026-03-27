"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, Users, BarChart3 } from "lucide-react";

const PROTOCOL_LINKS = [
  {
    label: "Treasury",
    href: "https://debank.com/profile/0x690c2e187c8254a887b35c0b4477ce6787f92855",
    icon: Wallet,
  },
  {
    label: "DAO",
    href: "https://app.aragon.org/dao/base-mainnet/0x690C2e187c8254a887B35C0B4477ce6787F92855/dashboard",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "https://dune.com/xyk/donut-company",
    icon: BarChart3,
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Who can take the miner seat?",
    a: "Anyone who pays the current listed price. There are no permissions or allowlists.",
  },
  {
    q: "What do I earn as a miner?",
    a: "$DONUT accrues every second while you hold the seat, plus you receive 85% of the next takeover payment when someone replaces you.",
  },
  {
    q: "How do I vote?",
    a: "Stake DONUT to receive gDONUT, then allocate your votes across active strategies during the current 7-day epoch.",
  },
  {
    q: "Why is gDONUT non-transferable?",
    a: "So voting power cannot be traded, rented, or concentrated through secondary markets. Governance stays with stakers.",
  },
  {
    q: "What are auctions?",
    a: "Each strategy sells its accumulated revenue through a Dutch auction. The price starts high and falls until a buyer purchases the entire batch in one transaction.",
  },
  {
    q: "Is this risk-free?",
    a: "No. Timing risk and market risk apply to both mining and auctions. This is not a promise of profit.",
  },
] as const;

export default function InfoPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
              About
            </h1>
            <p className="page-subtitle">
              How the GlazeCorp protocol works.
            </p>
          </div>

          <motion.div
            className="space-y-4 sm:space-y-5 pb-6 pt-2 lg:pt-0"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ── Protocol Links ─────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {PROTOCOL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="slab-panel rounded-[var(--radius)] px-4 py-4 flex flex-col items-center gap-2 hover:bg-[hsl(var(--foreground)/0.03)] transition-colors cursor-pointer"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[13px] sm:text-[14px] font-medium tracking-[-0.01em]">
                    {label}
                  </span>
                </a>
              ))}
            </div>

            {/* ── DonutMiner ─────────────────────────────────────── */}
            <div className="slab-panel rounded-[var(--radius)] px-4 sm:px-6 py-5 sm:py-6">
              <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em]">
                DonutMiner
              </h2>
              <p className="text-[14px] leading-relaxed text-muted-foreground mt-1 mb-5">
                A rotating seat that mints $DONUT and routes fees to the
                DonutDAO treasury.
              </p>

              {/* TL;DR */}
              <div className="rounded-lg bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] px-4 py-4 mb-5">
                <h3 className="text-[14px] font-semibold mb-2.5">TL;DR</h3>
                <ul className="space-y-2">
                  {[
                    "One seat. One miner at a time.",
                    "Price to take the seat falls over 1 hour.",
                    "While you hold the seat, you accrue $DONUT every second.",
                    "When someone replaces you, you receive your accrued $DONUT + 85% of what they paid.",
                    "15% of every takeover goes to the DonutDAO treasury.",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* How it works */}
              <h3 className="text-[14px] font-semibold mb-2.5">How it works</h3>
              <ol className="space-y-2 mb-5 list-none">
                {[
                  "A 1-hour timer starts with a listed seat price.",
                  "The listed price falls over time toward zero.",
                  "Anyone can pay the current price (WETH) to take the seat.",
                  "The takeover payment splits: 85% to outgoing miner, 15% to DonutDAO treasury.",
                  "The outgoing miner receives all $DONUT accrued during their time.",
                  "A new hour starts with an updated starting price.",
                  "The $DONUT mint rate follows a halving schedule (~30 days) until reaching a tail rate.",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-0.5 text-[12px] font-mono font-medium text-foreground/50 w-4 shrink-0 text-right">
                      {i + 1}.
                    </span>
                    {item}
                  </li>
                ))}
              </ol>

              {/* Mint rate */}
              <h3 className="text-[14px] font-semibold mb-2.5">
                $DONUT mint rate
              </h3>
              <ul className="space-y-2">
                {[
                  "While you hold the seat, $DONUT accrues per second.",
                  "The per-second rate halves about every 30 days until it reaches a tail rate.",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── LiquidSignal ───────────────────────────────────── */}
            <div className="slab-panel rounded-[var(--radius)] px-4 sm:px-6 py-5 sm:py-6">
              <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em]">
                LiquidSignal
              </h2>
              <p className="text-[14px] leading-relaxed text-muted-foreground mt-1 mb-5">
                DONUT stakers route protocol revenue into strategy buckets,
                with auctions and voter rewards.
              </p>

              {/* TL;DR */}
              <div className="rounded-lg bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] px-4 py-4 mb-5">
                <h3 className="text-[14px] font-semibold mb-2.5">TL;DR</h3>
                <ul className="space-y-2">
                  {[
                    "Stake DONUT to get gDONUT (non-transferable).",
                    "gDONUT is used for voting in Aragon (DAO) and LiquidSignal.",
                    "Aragon DAO adds/removes strategies (normal DAO voting).",
                    "LiquidSignal decides how revenue is split across strategies (every 7 days).",
                    "Strategies auction revenue with falling-price sales (Dutch auctions).",
                    "Auction payments go to the Aragon DAO treasury, minus a global voter reward split.",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key concepts */}
              <h3 className="text-[14px] font-semibold mb-2.5">
                Key concepts
              </h3>
              <ul className="space-y-2 mb-5">
                {[
                  {
                    term: "gDONUT",
                    desc: "Stake DONUT to receive gDONUT. Non-transferable governance weight.",
                  },
                  {
                    term: "Epochs",
                    desc: "7-day voting windows. One vote or reset per epoch.",
                  },
                  {
                    term: "Strategies",
                    desc: "Outlets that receive revenue and run auctions.",
                  },
                ].map(({ term, desc }, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>
                      <span className="font-medium text-foreground">
                        {term}:
                      </span>{" "}
                      {desc}
                    </span>
                  </li>
                ))}
              </ul>

              {/* How it works */}
              <h3 className="text-[14px] font-semibold mb-2.5">How it works</h3>
              <ol className="space-y-2 list-none">
                {[
                  "Revenue arrives from DonutMiner into a holding area.",
                  "gDONUT holders vote on how to split revenue across active strategies for the current 7-day epoch.",
                  "Anyone can trigger distribution, pushing revenue into each strategy based on the vote split.",
                  "Each strategy auctions its entire balance using a Dutch auction.",
                  "One buyer purchases the whole batch in one transaction.",
                  "The buyer's payment splits: voter reward portion goes to voters, rest goes to DAO treasury.",
                  "Voter rewards stream over 7 days and can be claimed anytime.",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                  >
                    <span className="mt-0.5 text-[12px] font-mono font-medium text-foreground/50 w-4 shrink-0 text-right">
                      {i + 1}.
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            {/* ── FAQ ────────────────────────────────────────────── */}
            <div className="slab-panel rounded-[var(--radius)] px-4 sm:px-6 py-5 sm:py-6">
              <h2 className="font-semibold text-[18px] font-display tracking-[-0.03em] mb-4">
                FAQ
              </h2>
              <div className="space-y-5">
                {FAQ_ITEMS.map(({ q, a }, i) => (
                  <div key={i}>
                    <h3 className="text-[14px] font-semibold text-foreground mb-1">
                      {q}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
