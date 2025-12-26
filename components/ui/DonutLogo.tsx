import React from "react";

interface DonutLogoProps {
  className?: string;
}

export function DonutLogo({ className = "w-8 h-8" }: DonutLogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      {/* Outer ring with gradient */}
      <circle cx="256" cy="256" r="256" fill="url(#donutGradient)" />
      {/* Hole - matches dark background */}
      <circle cx="256" cy="256" r="90" fill="#0a0a0a" />
    </svg>
  );
}
