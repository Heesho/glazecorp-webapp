"use client";

import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "" }: DialogContentProps) {
  return (
    <div
      className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1b1b1b] rounded-2xl shadow-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-white/5 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-corp-50 ${className}`}>
      {children}
    </h2>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="p-2 rounded-lg text-corp-400 hover:text-corp-50 hover:bg-corp-800 transition-colors"
    >
      <X size={20} />
    </button>
  );
}
