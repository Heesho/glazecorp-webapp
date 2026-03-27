"use client";

import { motion } from "framer-motion";

const INFO_SECTIONS = [
  {
    title: "What is GlazeCorp?",
    content:
      "A perpetual funding platform on Base. Create fundraisers for creators, public goods, agents, charities, or anything at all. Supporters fund with USDC and mine Karma Coins — like Bitcoin mining, but for things you care about.",
    bullets: [
      "50% of every contribution goes directly to the recipient",
      "Liquidity is locked forever — LP is burned on launch",
      "All contracts are immutable — nobody can change the rules",
    ],
  },
  {
    title: "Mining",
    content:
      "Fund USDC into daily mining pools. Each day has a fixed number of coins to distribute. Your share of the pool determines your share of coins mined.",
    bullets: [
      "Each day has a fixed number of coins to distribute",
      "Fund more = mine more coins proportionally",
      "Claim your mined coins after each day ends",
      "Early days have the highest rewards — early supporters get the most",
    ],
  },
  {
    title: "Bitcoin-Style Rewards",
    content:
      "Coin rewards follow a Bitcoin-inspired halving schedule compressed from 4-year halvings to monthly halvings, with perpetual tail rewards.",
    bullets: [
      "~50% of total supply is mined in the first month",
      "Rewards halve every 30 days",
      "Tail rewards kick in after ~7 months — coins are mined forever",
      "~21M coins from halvings, then slow perpetual growth",
    ],
  },
  {
    title: "Funding Split",
    content:
      "Every contribution is split transparently on-chain. The majority goes directly to whoever is being funded.",
    bullets: [
      "50% — Recipient (the person or cause being funded)",
      "45% — Treasury (grows liquidity via auctions)",
      "4% — Team (the launcher who created the fundraiser)",
      "1% — Protocol fee",
      "If no recipient is set, their 50% goes to the treasury instead",
    ],
  },
  {
    title: "Treasury Auctions",
    content:
      "Treasury fees accumulate as USDC and are auctioned off to LP holders. This permanently deepens liquidity for the coin.",
    bullets: [
      "Dutch auction — price decays over time",
      "Buy when the price makes it profitable",
      "LP used in auctions gets burned — liquidity only grows",
    ],
  },
  {
    title: "For Launchers",
    content:
      "Launch a fundraiser in one click. Everything is configured at launch and locked forever — fully immutable.",
    bullets: [
      "Bitcoin-style coin rewards by default",
      "Earn 4% of all funding as the team fee",
      "Treasury grows liquidity automatically via auctions",
      "Set a recipient — 50% of all funding goes directly to them",
    ],
  },
];

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-background">
      <div
        className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        {/* Header */}
        <div className="page-header pt-2 lg:pt-[88px]">
          <div className="mx-auto w-full">
            <h1 className="page-title hidden lg:block">About</h1>
            <p className="page-subtitle hidden lg:block">How GlazeCorp works and why it matters.</p>
          </div>
        </div>

        {/* Mobile: glass cards stacked */}
        <motion.div
          className="flex-1 scrollbar-hide pb-3 pt-2 lg:hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto w-full space-y-4">
            {INFO_SECTIONS.map((section, index) => (
              <div
                key={index}
                className="slab-panel rounded-[var(--radius)] px-4 py-4"
              >
                <h2 className="mb-2 font-display text-[16px] font-semibold tracking-[-0.02em] text-foreground">
                  {section.title}
                </h2>
                <p className="mb-3 text-[14px] leading-relaxed text-muted-foreground">
                  {section.content}
                </p>
                <ul className="space-y-2">
                  {section.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Desktop: card grid */}
        <motion.div
          className="hidden lg:block flex-1 scrollbar-hide pb-6 pt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto w-full grid grid-cols-2 xl:grid-cols-3 gap-5">
            {INFO_SECTIONS.map((section, index) => (
              <div
                key={index}
                className="slab-panel rounded-[var(--radius)] px-5 py-5"
              >
                <h2 className="mb-3 font-display text-[17px] font-semibold tracking-[-0.02em] text-foreground">
                  {section.title}
                </h2>
                <p className="mb-4 text-[14px] leading-relaxed text-muted-foreground">
                  {section.content}
                </p>
                <ul className="space-y-2">
                  {section.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[13px] leading-snug text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
