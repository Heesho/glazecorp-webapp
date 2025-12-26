"use client";

import * as React from "react";
import { Search } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#232323] rounded-xl px-4 py-3 text-sm text-corp-50 placeholder:text-corp-500 focus:outline-none transition-colors ${
            icon ? "pl-10" : ""
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

export function SearchInput(props: Omit<InputProps, "icon">) {
  return <Input icon={<Search size={18} />} {...props} />;
}
