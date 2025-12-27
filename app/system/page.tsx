"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { zeroAddress } from "viem";

import { Card } from "@/components/ui";
import {
  useSystemData,
  useFlushAndDistribute,
  SystemFlowVisualization,
  FlushButton,
  EpochTimingCard,
} from "@/features/system";
import { MULTICALL_ABI, MULTICALL_ADDRESS, TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { fetchEthPrice, fetchBtcPrice } from "@/lib/api/price";
import { getLpTokenPriceUsd } from "@/lib/api/uniswapV2";
import { POLLING_INTERVAL_MS } from "@/config/constants";
import type { Address } from "viem";

export default function SystemPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [ethPrice, setEthPrice] = useState(0);
  const [btcPrice, setBtcPrice] = useState(0);
  const [donutPriceUsd, setDonutPriceUsd] = useState(0);
  const [lpPriceUsd, setLpPriceUsd] = useState(0);

  const { systemOverview, strategies, refetchAll, hasError, error } = useSystemData();

  const { txStep, txResult, isBusy, handleFlushAndDistribute } =
    useFlushAndDistribute(userAddress, refetchAll);

  // Fetch miner state to get donutPrice
  const { data: minerState } = useReadContract({
    address: MULTICALL_ADDRESS,
    abi: MULTICALL_ABI,
    functionName: "getMiner",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  const donutPriceInEth = (minerState as { donutPrice?: bigint } | undefined)?.donutPrice ?? 0n;

  // Fetch prices
  useEffect(() => {
    const fetchPrices = async () => {
      const [ethPriceValue, btcPriceValue] = await Promise.all([
        fetchEthPrice(),
        fetchBtcPrice(),
      ]);

      if (btcPriceValue > 0) {
        setBtcPrice(btcPriceValue);
      }

      if (ethPriceValue > 0) {
        setEthPrice(ethPriceValue);

        // Calculate donut price in USD
        if (donutPriceInEth > 0n) {
          const donutUsd = Number(donutPriceInEth) / 1e18 * ethPriceValue;
          setDonutPriceUsd(donutUsd);

          // Get LP price
          const lpPrice = await getLpTokenPriceUsd(
            TOKEN_ADDRESSES.donutEthLp as Address,
            ethPriceValue,
            donutUsd
          );
          if (lpPrice > 0) setLpPriceUsd(lpPrice);
        }
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [donutPriceInEth]);

  return (
    <div className="pt-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">System Control Panel</h1>
          <p className="text-sm text-zinc-500 font-mono">
            Monitor and control WETH flow through the governance system
          </p>
        </div>

        {/* Error Display */}
        {hasError && (
          <Card noPadding className="mb-6 border-red-500/50">
            <div className="p-4">
              <div className="text-red-400 font-mono text-sm">
                Error loading system data. The contract may not be deployed or the functions may not exist.
              </div>
              <div className="text-red-400/60 font-mono text-xs mt-2">
                {error?.message || "Unknown error"}
              </div>
            </div>
          </Card>
        )}

        {/* Main Visualization */}
        <Card noPadding className="mb-6">
          <div className="p-4">
            <SystemFlowVisualization
              systemOverview={systemOverview}
              strategies={strategies}
              prices={{
                ethPrice,
                btcPrice,
                donutPriceUsd,
                lpPriceUsd,
              }}
            />
          </div>
        </Card>

        {/* Distribute Button */}
        <div className="mb-6">
          <FlushButton
            txStep={txStep}
            txResult={txResult}
            isBusy={isBusy}
            isConnected={isConnected}
            onClick={handleFlushAndDistribute}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EpochTimingCard systemOverview={systemOverview} />

          <Card noPadding>
            <div className="p-4">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
                Bribe Split
              </div>
              <div className="text-3xl font-bold font-mono text-white">
                {systemOverview ? Number(systemOverview.bribeSplit) / 100 : 0}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Percentage of strategy revenue going to bribes
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
