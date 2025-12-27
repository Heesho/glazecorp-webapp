"use client";

import React, { useMemo } from "react";

interface AnimatedPipeProps {
  id: string;
  path: string;
  flowPercent: number; // 0-100 percentage
  direction?: "forward" | "reverse";
  strokeWidth?: number;
  isActive?: boolean;
  particleColor?: string;
}

export function AnimatedPipe({
  id,
  path,
  flowPercent,
  direction = "forward",
  strokeWidth = 4,
  isActive = true,
  particleColor = "#ec4899",
}: AnimatedPipeProps) {
  // Calculate animation duration based on percentage (higher % = faster)
  const animationDuration = useMemo(() => {
    if (flowPercent <= 0) return 10;
    // Higher percentage = faster flow (shorter duration)
    // 100% = 2s, 10% = 6s, 1% = 8s
    const speed = Math.max(flowPercent / 100, 0.1);
    return Math.max(2, 8 - speed * 6);
  }, [flowPercent]);

  // Number of particles based on percentage
  const particleCount = useMemo(() => {
    if (flowPercent <= 0) return 2;
    // More particles for higher percentages: 3-8 particles
    return Math.min(Math.max(Math.floor(flowPercent / 15) + 3, 3), 8);
  }, [flowPercent]);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      delay: (i / particleCount) * animationDuration,
    }));
  }, [particleCount, animationDuration]);

  const pathId = `path-${id}`;

  return (
    <g>
      {/* Define the path for animation reference */}
      <path id={pathId} d={path} fill="none" stroke="none" />

      {/* Pipe background (dark) */}
      <path
        d={path}
        fill="none"
        stroke="#27272a"
        strokeWidth={strokeWidth + 2}
        strokeLinecap="round"
      />

      {/* Pipe inner (slightly lighter) */}
      <path
        d={path}
        fill="none"
        stroke="#3f3f46"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Animated particles */}
      {isActive &&
        particles.map((particle) => (
          <circle
            key={particle.id}
            r={strokeWidth / 2 - 0.5}
            fill={particleColor}
            filter="url(#glow)"
          >
            <animateMotion
              dur={`${animationDuration}s`}
              repeatCount="indefinite"
              begin={`${particle.delay}s`}
              keyPoints={direction === "reverse" ? "1;0" : "0;1"}
              keyTimes="0;1"
            >
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        ))}
    </g>
  );
}

// SVG filter for glow effect - to be included in parent SVG
export function GlowFilter() {
  return (
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
