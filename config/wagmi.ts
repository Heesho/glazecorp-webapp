import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { base } from "wagmi/chains";

// WalletConnect project ID - get one at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder";

export const config = getDefaultConfig({
  appName: "GlazeCorp",
  projectId,
  chains: [base],
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});
