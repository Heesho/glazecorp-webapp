"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      // Route changed — reset then animate in
      setVisible(false);
      const timer = setTimeout(() => setVisible(true), 50);
      prevPath.current = pathname;
      return () => clearTimeout(timer);
    } else {
      // Initial mount — animate in
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Landing page doesn't get the slide-up — it has its own hero animation
  if (isLanding) {
    return <>{children}</>;
  }

  // Using margin-top instead of transform for the slide-up effect
  // because transform on a parent breaks position:fixed on children
  // (fixed elements become relative to the transformed parent)
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {children}
    </div>
  );
}
