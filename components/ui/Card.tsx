"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  rightHeader?: React.ReactNode;
  noPadding?: boolean;
  size?: "sm" | "default" | "lg";
}

export function Card({
  children,
  className = "",
  title,
  icon,
  rightHeader,
  noPadding = false,
  size = "default",
}: CardProps) {
  const paddingClass = noPadding ? "" : size === "sm" ? "p-3" : size === "lg" ? "p-5" : "p-4";

  return (
    <div
      className={`
        relative flex flex-col overflow-hidden
        bg-[#131313] rounded-xl
        ${className}
      `}
    >
      {/* Header */}
      {(title || rightHeader) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-glaze-400">{icon}</span>}
            {title && (
              <span className="text-sm font-medium text-corp-300">
                {title}
              </span>
            )}
          </div>
          {rightHeader && <div>{rightHeader}</div>}
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col min-h-0 ${paddingClass}`}>
        {children}
      </div>
    </div>
  );
}
