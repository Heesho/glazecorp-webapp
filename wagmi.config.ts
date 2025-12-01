import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GlazeCorp',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get one at https://cloud.walletconnect.com
  chains: [base],
  ssr: false,
});
