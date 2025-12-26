"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hammer,
  ArrowLeftRight,
  Vote,
  Store,
  Gavel,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV_ITEMS = [
  { href: "/", icon: Hammer, label: "Mine" },
  { href: "/swap", icon: ArrowLeftRight, label: "Swap" },
  { href: "/govern", icon: Vote, label: "Vote" },
  { href: "/franchise", icon: Store, label: "Franchise" },
  { href: "/auctions", icon: Gavel, label: "Auction" },
];

export function Header() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="h-14 fixed top-0 left-0 right-0 bg-[#131313]/40 backdrop-blur-sm flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-bold text-2xl text-white tracking-tight">
            Glaze<span className="text-glaze-400">Corp</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                  isActive(href)
                    ? "bg-glaze-500 text-white shadow-lg shadow-glaze-500/20"
                    : "text-corp-400 hover:text-corp-100 hover:bg-corp-800"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center">
          <ConnectButton />
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#131313] flex items-center justify-around px-2 z-50">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
              isActive(href) ? "text-glaze-400" : "text-corp-500"
            }`}
          >
            <Icon size={18} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
