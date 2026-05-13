import type { FarcasterProfile } from "@/types/miner";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type ApiProfile = {
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
};

function toFarcasterProfile(payload: ApiProfile | null | undefined): FarcasterProfile | null {
  if (!payload || payload.fid == null) return null;
  return {
    username: payload.username ?? "",
    displayName: payload.displayName ?? "",
    pfp: payload.pfpUrl ?? "",
    fid: payload.fid,
  };
}

/**
 * Fetch a single Farcaster profile by Ethereum address.
 * Proxied through /api/neynar/user so the API key never leaves the server.
 */
export async function fetchFarcasterProfile(
  address: string,
): Promise<FarcasterProfile | null> {
  if (!address || address === ZERO_ADDRESS) return null;

  try {
    const res = await fetch(`/api/neynar/user?address=${encodeURIComponent(address)}`);
    if (!res.ok) {
      if (res.status !== 404) {
        console.error("Neynar proxy error:", res.status, await res.text().catch(() => ""));
      }
      return null;
    }
    const json = (await res.json()) as { user: ApiProfile | null };
    return toFarcasterProfile(json.user);
  } catch (error) {
    console.error("Neynar Error:", error);
    return null;
  }
}

/**
 * Fetch multiple Farcaster profiles by Ethereum addresses (bulk).
 * Proxied through /api/neynar/users-by-addresses so the API key never leaves the server.
 */
export async function fetchFarcasterProfiles(
  addresses: string[],
): Promise<Record<string, FarcasterProfile>> {
  if (addresses.length === 0) return {};

  const unique = [
    ...new Set(
      addresses
        .filter((a) => a && a.length > 0 && a !== ZERO_ADDRESS)
        .map((a) => a.toLowerCase()),
    ),
  ];
  if (unique.length === 0) return {};

  try {
    const res = await fetch(
      `/api/neynar/users-by-addresses?addresses=${encodeURIComponent(unique.join(","))}`,
    );
    if (!res.ok) {
      if (res.status !== 404) {
        console.error("Neynar bulk proxy error:", res.status, await res.text().catch(() => ""));
      }
      return {};
    }
    const json = (await res.json()) as { users: Record<string, ApiProfile | null> };

    const result: Record<string, FarcasterProfile> = {};
    for (const [addr, payload] of Object.entries(json.users ?? {})) {
      const profile = toFarcasterProfile(payload);
      if (profile) result[addr] = profile;
    }
    return result;
  } catch (error) {
    console.error("Neynar Bulk Error:", error);
    return {};
  }
}
