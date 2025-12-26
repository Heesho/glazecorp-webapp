import { HALVING_PERIOD_SECONDS } from '@/config/constants';

const EPOCH_DURATION = 3600n; // 1 hour in seconds
const WEI_MULTIPLIER = 1000000000000000000n; // 1e18

/**
 * Calculate Dutch auction price based on time elapsed
 */
export function calculateDutchAuctionPrice(
  initPrice: bigint,
  startTime: number
): bigint {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const start = BigInt(startTime);
  const elapsed = now - start;

  if (elapsed >= EPOCH_DURATION) return 0n;
  if (elapsed < 0n) return initPrice;

  // Decay formula: price = initPrice * (EPOCH_DURATION - elapsed) / EPOCH_DURATION
  const decay = ((EPOCH_DURATION - elapsed) * WEI_MULTIPLIER) / EPOCH_DURATION;
  return (initPrice * decay) / WEI_MULTIPLIER;
}

/**
 * Calculate the next halving timestamp
 */
export function calculateNextHalving(minerStartTime: number): number {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - minerStartTime;
  const currentHalvingNumber = Math.floor(elapsed / HALVING_PERIOD_SECONDS);
  const nextHalvingNumber = currentHalvingNumber + 1;
  return minerStartTime + nextHalvingNumber * HALVING_PERIOD_SECONDS;
}
