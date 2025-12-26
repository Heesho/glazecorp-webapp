"use client";

import { useEffect, useState } from "react";
import { DonutLogo } from "@/components/ui";
import { fetchGraphData } from "@/lib/api/graph";
import { fetchEthPrice } from "@/lib/api/price";

export default function LandingPage() {
  const [stats, setStats] = useState({ totalMined: "0", totalRevenue: "0" });
  const [ethPriceUsd, setEthPriceUsd] = useState(0);

  useEffect(() => {
    fetchGraphData().then((data) => {
      if (data?.miners?.[0]) {
        setStats({
          totalMined: data.miners[0].minted,
          totalRevenue: data.miners[0].revenue,
        });
      }
    });
    fetchEthPrice().then(setEthPriceUsd);
  }, []);

  const totalMinedNum = parseFloat(stats.totalMined || "0");
  const totalRevenueNum = parseFloat(stats.totalRevenue || "0");
  const totalRevenueUsd = totalRevenueNum * ethPriceUsd;

  const formatLargeNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#131313] relative overflow-hidden">
      {/* Floating donut outlines */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border border-glaze-500/[0.05]">
          <div className="absolute inset-[35%] rounded-full border border-glaze-500/[0.03]" />
        </div>
        <div className="absolute top-40 -right-32 w-96 h-96 rounded-full border border-white/[0.03]">
          <div className="absolute inset-[38%] rounded-full border border-white/[0.02]" />
        </div>
        <div className="absolute bottom-20 -left-24 w-72 h-72 rounded-full border border-glaze-500/[0.04]">
          <div className="absolute inset-[32%] rounded-full border border-glaze-500/[0.025]" />
        </div>
        <div className="absolute -bottom-32 right-20 w-80 h-80 rounded-full border border-white/[0.03]">
          <div className="absolute inset-[35%] rounded-full border border-white/[0.02]" />
        </div>
      </div>

      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-4">
        {/* Central glow - using same base color */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(236, 72, 153, 0.08) 0%, rgba(19, 19, 19, 0) 70%)`
          }}
        />

        <div className="relative text-center max-w-4xl mx-auto">
          {/* Logo with glow */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="absolute inset-0 blur-[60px] bg-glaze-500/30 scale-[2]" />
              <DonutLogo size={120} className="relative" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight">
            Glaze<span className="text-glaze-400">Corp</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-glaze-400/80 font-light mb-8">
            We Glaze The World
          </p>

          {/* Description */}
          <p className="text-base text-zinc-500 max-w-xl mx-auto leading-relaxed">
            The world&apos;s leading automated confectionery conglomerate.
            Primary contributor to <span className="text-zinc-400">DonutDAO</span>.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-20 px-4">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(19,19,19,0) 0%, rgba(236, 72, 153, 0.04) 50%, rgba(19,19,19,0) 100%)`
          }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                {formatLargeNumber(totalMinedNum)}
              </div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest">Donuts Produced</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-glaze-400 mb-2 tracking-tight">
                ${formatLargeNumber(totalRevenueUsd)}
              </div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest">Revenue</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">47</div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest">Countries</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">24/7</div>
              <p className="text-[11px] text-zinc-600 uppercase tracking-widest">Operations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom gradient */}
      <div
        className="h-24"
        style={{
          background: `radial-gradient(ellipse 80% 100% at 50% 100%, rgba(236, 72, 153, 0.04) 0%, rgba(19,19,19,0) 70%)`
        }}
      />
    </div>
  );
}
