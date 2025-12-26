"use client";

import { useState, useEffect } from "react";
import { calculateDutchAuctionPrice } from "@/lib/utils/calculations";
import { TICKER_INTERVAL_MS } from "@/config/constants";

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
    const timer = setInterval(() => {
      setNow(Date.now());

      // Update price
      const price = calculateDutchAuctionPrice(initPrice, startTime);
      setCurrentPrice(price);

      // Update halving countdown
      if (nextHalvingTime) {
        const diff = nextHalvingTime * 1000 - Date.now();
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setHalvingDisplay(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setHalvingDisplay("HALVING NOW");
        }
      }
    }, TICKER_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [initPrice, startTime, nextHalvingTime]);

  return { currentPrice, now, halvingDisplay };
}
