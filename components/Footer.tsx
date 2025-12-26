"use client";

import Link from "next/link";
import { BarChart3, BookOpen, FileText, Wallet, Users, MessageCircle } from "lucide-react";

// X (Twitter) icon
const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Farcaster icon
const FarcasterIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3h18v18H3V3zm15.5 4.5h-13V8l1.5 1v7.5h3V11h4v5.5h3V9l1.5-1V7.5z" />
  </svg>
);

type FooterLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
};

const PROTOCOL_LINKS: FooterLink[] = [
  { label: "Treasury", href: "https://debank.com/profile/0x690c2e187c8254a887b35c0b4477ce6787f92855", icon: Wallet },
  { label: "DAO", href: "https://app.aragon.org/dao/base-mainnet/0x690C2e187c8254a887B35C0B4477ce6787F92855/dashboard", icon: Users },
  { label: "Analytics", href: "https://dune.com/xyk/donut-company", icon: BarChart3 },
];

const RESOURCE_LINKS: FooterLink[] = [
  { label: "Docs", href: "#", icon: BookOpen, disabled: true },
];

const COMMUNITY_LINKS: FooterLink[] = [
  { label: "X (Twitter)", href: "#", icon: XIcon, disabled: true },
  { label: "Farcaster", href: "#", icon: FarcasterIcon, disabled: true },
  { label: "Discord", href: "#", icon: MessageCircle, disabled: true },
];

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const Icon = link.icon;

  if (link.disabled) {
    return (
      <span className="text-sm text-zinc-600 flex items-center gap-2 cursor-not-allowed">
        <Icon size={14} />
        {link.label}
        <span className="text-[10px] text-zinc-700">(soon)</span>
      </span>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-zinc-500 hover:text-glaze-400 transition-colors flex items-center gap-2"
    >
      <Icon size={14} />
      {link.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#131313] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Protocol */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Protocol</h4>
            <ul className="space-y-2">
              {PROTOCOL_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Resources</h4>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Community</h4>
            <ul className="space-y-2">
              {COMMUNITY_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Legal</h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-glaze-400 transition-colors flex items-center gap-2"
                  >
                    <FileText size={14} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">Glaze<span className="text-glaze-400">Corp</span></span>
            <span className="text-zinc-600 text-sm">|</span>
            <span className="text-zinc-500 text-xs">Built on Base</span>
          </div>

          <p className="text-zinc-600 text-xs">
            {new Date().getFullYear()} GlazeCorp. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
