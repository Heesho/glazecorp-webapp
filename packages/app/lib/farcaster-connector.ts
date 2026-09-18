import { sdk } from "@farcaster/miniapp-sdk";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { createConnector } from "wagmi";

// Wagmi reconnects saved connectors before the UI can choose a wallet.
// The legacy connector returns an SDK provider even outside Farcaster, where
// eth_accounts never resolves. Gate it before reconnect can reach that call.
export function legacyFarcasterConnector() {
  return createConnector((config) => {
    const connector = farcasterMiniApp()(config);
    return {
      ...connector,
      async getProvider() {
        if (!(await sdk.isInMiniApp())) {
          throw new Error("Farcaster wallet provider not found in this browser");
        }
        return connector.getProvider.call(this);
      },
    };
  });
}
