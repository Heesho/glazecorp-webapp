"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const menuItems = [
  { href: "/mine", label: "Mine" },
  { href: "/vote", label: "Vote" },
  { href: "/auction", label: "Auction" },
  { href: "/info", label: "About" },
] as const;

// Map pathname to display name for mobile header
function getPageName(pathname: string): string | null {
  if (pathname === "/explore") return "Explore";
  if (pathname === "/mine") return "Mine";
  if (pathname === "/vote") return "Vote";
  if (pathname === "/auction") return "Auction";
  if (pathname === "/launch") return "Launch";
  if (pathname === "/info") return "About";
  if (pathname === "/profile") return "Profile";
  if (pathname.startsWith("/fundraiser/")) return null;
  return null;
}

function isFundraiserPage(pathname: string): boolean {
  return pathname.startsWith("/fundraiser/");
}

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === "/";
  const isFundraiser = isFundraiserPage(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const pageName = getPageName(pathname);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Listen for "open-nav-menu" custom event (used by landing page Enter App)
  useEffect(() => {
    const handler = () => setMenuOpen(true);
    window.addEventListener("open-nav-menu", handler);
    return () => window.removeEventListener("open-nav-menu", handler);
  }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  // Landing: white elements (over video), transparent header bg
  // Inner pages: black elements, white header bg
  // Menu open: always dark text on white bg
  const hamburgerColor = menuOpen ? "text-black" : isLanding ? "text-white" : "text-black";
  const headerBg = isLanding && !menuOpen ? "" : "bg-white";

  return (
    <>
      {/* Fixed top bar — always visible */}
      <div className={`fixed top-0 left-0 right-0 z-[210] pointer-events-none ${headerBg}`}>
        {/* Mobile header — compact: logo left, page name center, hamburger right */}
        <div className="flex lg:hidden items-center justify-between px-4 py-2">
          {/* Logo icon */}
          <div className="pointer-events-auto w-9 h-9 flex items-center justify-center">
            <Link href="/" onClick={() => setMenuOpen(false)} className="hover:opacity-80 transition-opacity">
              <img
                src="/media/logo-transparent.png"
                alt="GlazeCorp"
                className="h-7 w-7 object-contain"
              />
            </Link>
          </div>

          {/* Page name or ticker center slot */}
          {!isLanding && !menuOpen && pageName && (
            <span
              className="absolute left-1/2 -translate-x-1/2 font-bold text-[17px] tracking-[-0.02em] text-black"
              style={{ fontFamily: '"Metropolis", sans-serif' }}
            >
              {pageName}
            </span>
          )}
          {/* Portal target for fundraiser ticker */}
          {isFundraiser && !menuOpen && (
            <div id="nav-center-slot" className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-auto" />
          )}

          {/* Landing: show give.fun text centered instead of page name */}
          {isLanding && !menuOpen && (
            <span
              className="absolute left-1/2 -translate-x-1/2 font-bold text-[17px] tracking-[-0.02em] text-white"
              style={{ fontFamily: '"Metropolis", sans-serif' }}
            >
              GlazeCorp
            </span>
          )}

          {/* Hamburger — same size as logo for visual balance */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`pointer-events-auto w-9 h-9 flex items-center justify-center hover:opacity-70 transition-all touch-manipulation ${hamburgerColor}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="relative w-5 h-4 flex flex-col justify-center items-center">
              <span
                className="absolute block w-5 h-[2px] bg-current transition-all duration-300 origin-center"
                style={{ transform: menuOpen ? "rotate(45deg)" : "translateY(-4px)" }}
              />
              <span
                className="absolute block w-5 h-[2px] bg-current transition-all duration-300"
                style={{ opacity: menuOpen ? 0 : 1 }}
              />
              <span
                className="absolute block w-5 h-[2px] bg-current transition-all duration-300 origin-center"
                style={{ transform: menuOpen ? "rotate(-45deg)" : "translateY(4px)" }}
              />
            </span>
          </button>
        </div>

        {/* Desktop header — larger with more breathing room */}
        <div className="hidden lg:flex items-center justify-between mx-auto max-w-[1400px] px-8 xl:px-16 py-4">
          {/* Logo — bigger on desktop */}
          <div className="pointer-events-auto">
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img
                src="/media/logo-transparent.png"
                alt="GlazeCorp"
                className="h-12 w-12 object-contain"
              />
              <span
                className={`font-bold tracking-[-0.02em] text-[1.75rem] transition-colors duration-300 ${
                  isLanding && !menuOpen ? "text-white" : "text-black"
                }`}
                style={{ fontFamily: '"Metropolis", sans-serif' }}
              >
                GlazeCorp
              </span>
            </Link>
          </div>

          {/* Hamburger — bigger on desktop */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`pointer-events-auto w-14 h-14 flex items-center justify-center hover:opacity-70 transition-all touch-manipulation ${hamburgerColor}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="relative w-9 h-6 flex flex-col justify-center items-center">
              <span
                className="absolute block w-9 h-[3px] bg-current transition-all duration-300 origin-center"
                style={{ transform: menuOpen ? "rotate(45deg)" : "translateY(-7px)" }}
              />
              <span
                className="absolute block w-9 h-[3px] bg-current transition-all duration-300"
                style={{ opacity: menuOpen ? 0 : 1 }}
              />
              <span
                className="absolute block w-9 h-[3px] bg-current transition-all duration-300 origin-center"
                style={{ transform: menuOpen ? "rotate(-45deg)" : "translateY(7px)" }}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Full-screen menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8">
              {menuItems.map(({ label, href }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.06 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(href as any);
                    }}
                    className={`block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black transition-colors touch-manipulation ${
                      pathname === href ? "text-primary" : "hover:text-primary"
                    }`}
                    style={{ color: pathname === href ? undefined : "#000000" }}
                  >
                    {label}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
