"use client";

import { useState, useEffect } from "react";
import { calculateDutchAuctionPrice } from "@/lib/miner/calculations";
import { TICKER_INTERVAL_MS } from "@/config/miner-constants";

interface UsePriceTickerReturn {
  currentPrice: bigint;
  now: number;
  halvingDisplay: string;
}

export function usePriceTicker(
  initPrice: bigint,
  startTime: number,
  nextHalvingTime: number | null
): UsePriceTickerReturn {
  const [currentPrice, setCurrentPrice] = useState<bigint>(0n);
  const [now, setNow] = useState(0);
  const [halvingDisplay, setHalvingDisplay] = useState("--d --h --m --s");

  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      setCurrentPrice(calculateDutchAuctionPrice(initPrice, startTime));

      if (nextHalvingTime) {
        const diff = nextHalvingTime * 1000 - Date.now();
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
          );
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setHalvingDisplay(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setHalvingDisplay("HALVING NOW");
        }
      }
    };

    update();
    const timer = setInterval(() => {
      update();
    }, TICKER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [initPrice, nextHalvingTime, startTime]);

  return { currentPrice, now, halvingDisplay };
}
