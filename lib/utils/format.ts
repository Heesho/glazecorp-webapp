import { ethers } from 'ethers';

/**
 * Format wei to ETH with specified decimal places
 */
export function formatEth(wei: bigint, decimals = 4): string {
  try {
    if (!wei) return "0.0000";
    const float = parseFloat(ethers.formatEther(wei));
    if (float === 0) return "0.0000";
    return float.toFixed(decimals);
  } catch {
    return "0.0000";
  }
}

/**
 * Format wei to whole Donut tokens with locale formatting
 */
export function formatDonut(wei: bigint): string {
  try {
    if (!wei) return "0";
    const val = parseFloat(ethers.formatEther(wei));
    return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } catch {
    return "0";
  }
}

/**
 * Truncate Ethereum address for display
 */
export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return "0x00...0000";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Check if URI points to an image
 */
export function isImageUri(uri: string): boolean {
  if (!uri) return false;
  return (
    uri.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null ||
    uri.includes("imgur") ||
    uri.includes("picsum")
  );
}
