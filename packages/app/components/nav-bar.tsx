"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Info } from "lucide-react";
import { useFarcaster } from "@/hooks/useFarcaster";
import { motion, AnimatePresence } from "framer-motion";

function ProfileIcon({ isActive }: { isActive: boolean }) {
  const { user, address } = useFarcaster();
  const pfpUrl = user?.pfpUrl;
  const fallback = address ? address.slice(-2).toUpperCase() : "??";

  return (
    <div
      className={cn(
        "border border-[hsl(var(--foreground)/0.1)] rounded-full flex h-8 w-8 items-center justify-center overflow-hidden transition-all",
        pfpUrl
          ? isActive ? "bg-[hsl(var(--foreground)/0.06)] shadow-glass" : "bg-[hsl(var(--foreground)/0.03)] opacity-70 hover:opacity-100"
          : isActive
            ? "bg-primary text-primary-foreground shadow-glass"
            : "bg-[hsl(var(--foreground)/0.03)] text-muted-foreground hover:bg-[hsl(var(--foreground)/0.08)] hover:text-foreground"
      )}
    >
      {pfpUrl ? (
        <img src={pfpUrl} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[10px] font-mono font-semibold tracking-[0.08em]">{fallback}</span>
      )}
    </div>
  );
}

export function NavBar({
  attachedTop = false,
  desktopWide = false,
}: {
  attachedTop?: boolean;
  desktopWide?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Body scroll lock when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const isFundraiserPage = pathname.startsWith("/fundraiser/");

  const iconItems: Array<{
    href: "/explore" | "/launch" | "/info";
    icon: typeof LayoutGrid;
    isActive: boolean;
  }> = [
    { href: "/explore", icon: LayoutGrid, isActive: pathname === "/explore" || pathname === "/" || isFundraiserPage },
    { href: "/launch", icon: Plus, isActive: pathname === "/launch" },
    { href: "/info", icon: Info, isActive: pathname === "/info" },
  ];

  const isProfileActive = pathname === "/profile";
  const desktopLinks = [
    { href: "/explore", label: "Explore", isActive: pathname === "/explore" || pathname === "/" || isFundraiserPage },
    { href: "/launch", label: "Launch", isActive: pathname === "/launch" },
    { href: "/info", label: "About", isActive: pathname === "/info" },
  ] as const;

  const mobileMenuItems = [
    { href: "/explore", label: "Explore" },
    { href: "/launch", label: "Launch" },
    { href: "/info", label: "About" },
    { href: "/profile", label: "Profile" },
  ] as const;

  return (
    <>
      {/* Desktop header with glass background */}
      {desktopWide && (
        <motion.header
          className="fixed inset-x-0 top-0 z-50 hidden lg:block border-b border-[hsl(var(--foreground)/0.08)]"
          style={{
            background: "hsl(var(--background) / 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mx-auto w-full lg:max-w-[1360px] xl:max-w-[1480px] px-8 xl:px-10">
          <div className="mx-auto flex w-full max-w-[1360px] items-center gap-10 py-3.5">
            <Link href="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80">
              <img
                src="/media/logo-transparent.png"
                alt="GlazeCorp"
                className="h-9 w-9 object-contain"
              />
              <div className="font-display text-[17px] font-semibold tracking-[-0.03em] text-primary">
                GlazeCorp
              </div>
            </Link>

            <nav className="flex flex-1 items-center gap-1">
              {desktopLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3.5 py-2 font-display text-[12px] font-semibold tracking-[0.02em] transition-all",
                    item.isActive
                      ? "text-foreground bg-[hsl(var(--primary)/0.1)] rounded-[var(--radius)] border border-[hsl(var(--primary)/0.15)]"
                      : "text-muted-foreground hover:text-foreground link-underline"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Link href="/profile" className="ml-auto flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80">
              <span
                className={cn(
                  "font-display text-[12px] font-semibold tracking-[0.02em] transition-colors",
                  isProfileActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Profile
              </span>
              <ProfileIcon isActive={isProfileActive} />
            </Link>
          </div>
          </div>
        </motion.header>
      )}

      {/* Hamburger button — mobile only */}
      {desktopWide && (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="fixed top-4 right-4 z-[210] flex h-10 w-10 flex-col items-center justify-center gap-0 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span
            className="block h-[2px] w-5 bg-foreground transition-all duration-300 ease-out"
            style={{
              transform: menuOpen ? "rotate(45deg) translateY(1px)" : "translateY(-6px)",
            }}
          />
          <span
            className="block h-[2px] w-5 bg-foreground transition-all duration-300 ease-out"
            style={{
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block h-[2px] w-5 bg-foreground transition-all duration-300 ease-out"
            style={{
              transform: menuOpen ? "rotate(-45deg) translateY(-1px)" : "translateY(6px)",
            }}
          />
        </button>
      )}

      {/* Full-screen mobile overlay menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {mobileMenuItems.map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-4xl sm:text-5xl md:text-6xl font-bold text-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom dock — mobile, hidden when overlay menu is open */}
      {!menuOpen && (
        <nav
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex justify-center",
            desktopWide && "lg:hidden"
          )}
        >
          <div
            className={cn(
              "dock-panel flex w-full max-w-[520px] items-center justify-around px-6",
              attachedTop && "dock-panel-attached"
            )}
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              paddingTop: "14px",
            }}
          >
            <div className="flex flex-1 items-center justify-around">
              {iconItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-[48px] flex-1 items-center justify-center transition-colors"
                >
                  <item.icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      item.isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    strokeWidth={1.5}
                  />
                </Link>
              ))}
              <Link
                href="/profile"
                className="flex min-h-[48px] flex-1 items-center justify-center transition-colors"
              >
                <ProfileIcon isActive={isProfileActive} />
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Desktop footer with glass style */}
      {desktopWide && (
        <footer
          className="hidden lg:block"
          style={{
            background: "linear-gradient(180deg, hsl(var(--surface-container-lowest) / 0.3) 0%, hsl(var(--background) / 0.6) 100%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 0 hsl(var(--foreground) / 0.1)",
          }}
        >
          <div className="mx-auto w-full lg:max-w-[1360px] xl:max-w-[1480px] px-8 py-10 xl:px-10">
            <div className="mx-auto w-full max-w-[1360px]">
              <div className="flex items-start justify-between gap-8">
                <div className="max-w-[320px]">
                  <div className="flex items-center gap-2">
                    <img
                      src="/media/logo-transparent.png"
                      alt="GlazeCorp"
                      className="h-8 w-8 object-contain"
                    />
                    <div className="font-display text-[16px] font-semibold tracking-[-0.03em] text-primary">
                      GlazeCorp
                    </div>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                    Mine donuts, earn yield, and glaze the world one block at a time. Built on Base.
                  </p>
                </div>

                <div className="flex gap-14">
                  <div>
                    <div className="mb-3 font-display text-[10px] font-semibold tracking-[0.02em] text-muted-foreground/60">
                      Navigate
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {desktopLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      ))}
                      <Link href="/profile" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                        Profile
                      </Link>
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 font-display text-[10px] font-semibold tracking-[0.02em] text-muted-foreground/60">
                      Protocol
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                        Contracts
                      </a>
                      <a href="https://warpcast.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                        Warpcast
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-[hsl(var(--foreground)/0.1)] pt-5">
                <div className="text-[12px] text-muted-foreground/50">
                  GlazeCorp protocol
                </div>
                <div className="text-[12px] text-muted-foreground/50">
                  Built on Base
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
