import "@fontsource/metropolis/400.css";
import "@fontsource/metropolis/500.css";
import "@fontsource/metropolis/600.css";
import "@fontsource/metropolis/700.css";
import "@/app/globals.css";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { GlobalNav } from "@/components/global-nav";
import { PageTransition } from "@/components/page-transition";

const appDomain = process.env.NEXT_PUBLIC_APP_URL || "https://glazecorp.io";
const heroImageUrl = `${appDomain}/media/hero.png`;
const splashImageUrl = `${appDomain}/media/splash.png`;

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const miniAppEmbed = {
  version: "1",
  imageUrl: heroImageUrl,
  button: {
    title: "Start funding",
    action: {
      type: "launch_miniapp" as const,
      name: "GlazeCorp",
      url: appDomain,
      splashImageUrl,
      splashBackgroundColor: "#000000",
    },
  },
};

export const metadata: Metadata = {
  title: "GlazeCorp",
  description: "Mine donuts, earn yield, and glaze the world one block at a time.",
  openGraph: {
    title: "GlazeCorp",
    description: "Mine donuts, earn yield, and glaze the world one block at a time.",
    url: appDomain,
    images: [
      {
        url: heroImageUrl,
      },
    ],
  },
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    "base:app_id": "694db1f1c63ad876c9081363",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${mono.variable}`}>
        <Providers>
          <GlobalNav />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
