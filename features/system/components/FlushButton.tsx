"use client";

import React from "react";
import { Button } from "@/components/ui";
import type { FlushTxStep } from "../hooks/useFlushAndDistribute";

interface FlushButtonProps {
  txStep: FlushTxStep;
  txResult: "success" | "failure" | null;
  isBusy: boolean;
  isConnected: boolean;
  onClick: () => void;
}

export function FlushButton({
  txStep,
  txResult,
  isBusy,
  isConnected,
  onClick,
}: FlushButtonProps) {
  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (txStep === "flushing") return "Signing...";
    if (txStep === "confirming") return "Confirming...";
    if (txResult === "success") return "Success!";
    if (txResult === "failure") return "Failed - Try Again";
    return "Distribute Revenue";
  };

  return (
    <Button
      variant="primary"
      onClick={onClick}
      disabled={isBusy || !isConnected}
      className={`
        ${txResult === "success" ? "!bg-green-500 !shadow-green-500/25" : ""}
        ${txResult === "failure" ? "!bg-red-500 !shadow-red-500/25" : ""}
      `}
    >
      {isBusy && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {getButtonText()}
    </Button>
  );
}
