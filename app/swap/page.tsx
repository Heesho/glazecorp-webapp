"use client";

import React, { useState } from "react";
import { ChevronDown, ArrowDown } from "lucide-react";
import { useAccount } from "wagmi";

import { DonutLogo, Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, SearchInput } from "@/components/ui";
import { useSwap, type SwapToken } from "@/features/swap";
import { NATIVE_ETH_ADDRESS } from "@/lib/api/kyber";

export default function SwapPage() {
  const { address: userAddress } = useAccount();

  return (
    <div className="flex items-start justify-center h-full pt-16">
      <div className="w-full max-w-[480px] px-4">
        <SwapPanel userAddress={userAddress} />
      </div>
    </div>
  );
}

function SwapPanel({ userAddress }: { userAddress?: `0x${string}` }) {
  const {
    tokenIn,
    tokenOut,
    setTokenIn,
    setTokenOut,
    allTokens,
    handleFlip,
    inputAmount,
    setInputAmount,
    outputAmount,
    formattedBalance,
    formattedBalanceOut,
    handleSetMax,
    quote,
    uniV2Quote,
    hasQuote,
    isQuoting,
    quoteError,
    priceImpact,
    calculatedOutputUsd,
    calculatedInputUsd,
    swapStep,
    swapError,
    isBusy,
    needsApproval,
    handleApprove,
    handleSwap,
    slippageBps,
    setSlippageBps,
    minReceived,
    willSwapFail,
  } = useSwap();

  const [tokenSelectMode, setTokenSelectMode] = useState<"in" | "out" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customSlippage, setCustomSlippage] = useState("");
  const [swapStatus, setSwapStatus] = useState<"idle" | "success" | "failed">("idle");

  const formatBalance = (bal: string) => {
    const num = parseFloat(bal);
    if (num < 0.0001) return "0.00";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatOutput = (amt: string) => {
    if (!amt) return "0";
    const num = parseFloat(amt);
    if (num === 0) return "0";
    if (num < 0.000001) return num.toFixed(8);
    if (num < 0.0001) return num.toFixed(6);
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const TokenIcon = ({ token, size = "md" }: { token: SwapToken; size?: "sm" | "md" | "lg" | "xl" }) => {
    const sizeClasses = {
      sm: "w-5 h-5",
      md: "w-7 h-7",
      lg: "w-9 h-9",
      xl: "w-10 h-10",
    };

    if (token.symbol === "DONUT") {
      return <DonutLogo className={sizeClasses[size]} />;
    }

    if (token.logoUrl) {
      return (
        <img
          src={token.logoUrl}
          alt={token.symbol}
          className={`${sizeClasses[size]} rounded-full object-cover bg-corp-800`}
        />
      );
    }

    return (
      <div className={`${sizeClasses[size]} rounded-full bg-corp-700 flex items-center justify-center text-xs font-bold text-corp-300`}>
        {token.symbol.slice(0, 2)}
      </div>
    );
  };

  // Check if a token is a franchise token (not ETH or DONUT)
  const isFranchiseToken = (token: SwapToken) => !["ETH", "DONUT"].includes(token.symbol);

  // Get the other side's token based on mode
  const otherToken = tokenSelectMode === "in" ? tokenOut : tokenIn;

  // If other side is a franchise token, only allow ETH/DONUT selection (no franchise-to-franchise)
  const availableTokens = isFranchiseToken(otherToken)
    ? allTokens.filter((t) => ["ETH", "DONUT"].includes(t.symbol))
    : allTokens;

  const quickTokens = availableTokens.filter((t) => ["ETH", "DONUT"].includes(t.symbol));

  const filteredTokens = availableTokens.filter((t) =>
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTokenSelect = (token: SwapToken) => {
    if (tokenSelectMode === "in") setTokenIn(token);
    else setTokenOut(token);
    setTokenSelectMode(null);
    setSearchQuery("");
  };

  const excludeAddress = tokenSelectMode === "in" ? tokenOut.address : tokenIn.address;

  const prevSwapStep = React.useRef(swapStep);
  React.useEffect(() => {
    if (prevSwapStep.current === "confirming" && swapStep === "idle") {
      if (!swapError) {
        setSwapStatus("success");
        setTimeout(() => setSwapStatus("idle"), 2000);
      }
    }
    if (swapError && prevSwapStep.current !== "idle") {
      setSwapStatus("failed");
      setTimeout(() => setSwapStatus("idle"), 2000);
    }
    prevSwapStep.current = swapStep;
  }, [swapStep, swapError]);

  const getButtonText = () => {
    if (swapStatus === "success") return "Swap successful!";
    if (swapStatus === "failed") return "Swap failed";
    if (swapStep === "approving") return "Approving...";
    if (swapStep === "swapping" || swapStep === "confirming") return "Swapping...";
    if (isQuoting) return "Finding route...";
    if (hasQuote && needsApproval) return "Approve";
    return "Swap";
  };

  const handleButtonClick = () => {
    if (needsApproval) handleApprove();
    else handleSwap();
  };

  const isButtonDisabled = !userAddress || isBusy || !inputAmount || parseFloat(inputAmount) <= 0 || (!needsApproval && !hasQuote);

  return (
    <>
      <Dialog open={tokenSelectMode !== null} onOpenChange={() => { setTokenSelectMode(null); setSearchQuery(""); }}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select a token</DialogTitle>
            <DialogClose onClose={() => { setTokenSelectMode(null); setSearchQuery(""); }} />
          </DialogHeader>

          <div className="px-4 pb-3">
            <SearchInput
              placeholder="Search by name or symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {!searchQuery && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-2">
                {quickTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleTokenSelect(token)}
                    disabled={token.address === excludeAddress}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
                      token.address === excludeAddress
                        ? "opacity-30 cursor-not-allowed border-white/5 bg-white/5"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <TokenIcon token={token} size="sm" />
                    <span className="text-sm font-medium text-corp-100">{token.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="px-2 py-2 text-xs text-corp-500 flex items-center gap-2">
              <span>Popular tokens</span>
            </div>
            {filteredTokens.map((token) => {
              const isExcluded = token.address === excludeAddress;
              return (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  disabled={isExcluded}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    isExcluded ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5"
                  }`}
                >
                  <TokenIcon token={token} size="lg" />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-corp-50">{token.name}</div>
                    <div className="text-sm text-corp-500">{token.symbol}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <div className="border border-corp-800 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-corp-400">Sell</span>
            <button
              onClick={handleSetMax}
              className="text-sm text-corp-500 hover:text-corp-300 transition-colors"
            >
              {formatBalance(formattedBalance)} {tokenIn.symbol}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-[36px] font-medium text-corp-50 placeholder:text-corp-600 focus:outline-none"
              />
              <div className="text-sm text-corp-500 mt-1">
                {isQuoting
                  ? <span className="animate-pulse">...</span>
                  : quote?.routeSummary?.amountInUsd && parseFloat(quote.routeSummary.amountInUsd) > 0
                    ? `$${parseFloat(quote.routeSummary.amountInUsd).toFixed(2)}`
                    : calculatedInputUsd
                      ? `$${calculatedInputUsd}`
                      : inputAmount && parseFloat(inputAmount) > 0
                        ? "$0"
                        : "-"}
              </div>
            </div>
            <button
              onClick={() => setTokenSelectMode("in")}
              className="flex items-center gap-2 bg-corp-800 hover:bg-corp-700 pl-2 pr-3 py-2 rounded-full transition-colors shrink-0"
            >
              <TokenIcon token={tokenIn} size="md" />
              <span className="font-semibold text-corp-50">{tokenIn.symbol}</span>
              <ChevronDown size={16} className="text-corp-400" />
            </button>
          </div>
        </div>

        <div className="flex justify-center -my-5 relative z-10">
          <button
            onClick={handleFlip}
            className="bg-[#131313] p-1 rounded-xl border-4 border-[#131313]"
          >
            <div className="bg-corp-800 hover:bg-corp-700 p-2 rounded-lg transition-colors">
              <ArrowDown size={16} className="text-corp-300" />
            </div>
          </button>
        </div>

        <div className="bg-corp-800 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-corp-400">Buy</span>
            <span className="text-sm text-corp-500">
              {formatBalance(formattedBalanceOut)} {tokenOut.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[36px] font-medium">
                {isQuoting ? (
                  <span className="text-corp-600 animate-pulse">...</span>
                ) : outputAmount && parseFloat(outputAmount) > 0 ? (
                  <span className="text-corp-50">{formatOutput(outputAmount)}</span>
                ) : (
                  <span className="text-corp-600">0</span>
                )}
              </div>
              <div className="text-sm text-corp-500 mt-1">
                {isQuoting
                  ? <span className="animate-pulse">...</span>
                  : quote?.routeSummary?.amountOutUsd && parseFloat(quote.routeSummary.amountOutUsd) > 0
                    ? `$${parseFloat(quote.routeSummary.amountOutUsd).toFixed(2)}`
                    : calculatedOutputUsd
                      ? `$${calculatedOutputUsd}`
                      : "$0"}
              </div>
            </div>
            <button
              onClick={() => setTokenSelectMode("out")}
              className="flex items-center gap-2 bg-corp-700 hover:bg-corp-600 pl-2 pr-3 py-2 rounded-full transition-colors shrink-0"
            >
              <TokenIcon token={tokenOut} size="md" />
              <span className="font-semibold text-corp-50">{tokenOut.symbol}</span>
              <ChevronDown size={16} className="text-corp-400" />
            </button>
          </div>
        </div>

        <div className="mt-1">
          <button
            onClick={handleButtonClick}
            disabled={isButtonDisabled || swapStatus !== "idle"}
            className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
              isButtonDisabled && swapStatus === "idle"
                ? "bg-glaze-500/30 text-glaze-400/50 cursor-not-allowed"
                : "bg-glaze-500 text-white hover:bg-glaze-600 shadow-lg shadow-glaze-500/25"
            }`}
          >
            {getButtonText()}
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-corp-500">Minimum received</span>
            <span className="text-corp-300">
              {minReceived > 0
                ? `${formatOutput(minReceived.toString())} ${tokenOut.symbol}`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-corp-500">Price impact</span>
            <span className={priceImpact > 5 ? "text-red-400" : priceImpact > 2 ? "text-yellow-400" : "text-corp-300"}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-corp-500">Slippage tolerance</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setSlippageBps(100); setCustomSlippage(""); }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  slippageBps === 100 && customSlippage === ""
                    ? "bg-glaze-500/20 text-glaze-400"
                    : "bg-corp-800 text-corp-400 hover:bg-corp-700 hover:text-corp-300"
                }`}
              >
                1%
              </button>
              <div className={`flex items-center rounded px-1.5 ${
                  customSlippage !== ""
                    ? "bg-glaze-500/20"
                    : "bg-corp-800"
                }`}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customSlippage}
                  onChange={(e) => {
                    const input = e.target.value;
                    setCustomSlippage(input);
                    if (input === "") {
                      setSlippageBps(100);
                      return;
                    }
                    const val = parseFloat(input);
                    if (!isNaN(val) && val > 0 && val < 100) {
                      setSlippageBps(Math.round(val * 100));
                    }
                  }}
                  placeholder="Custom"
                  className={`w-14 bg-transparent text-xs focus:outline-none py-0.5 ${
                    customSlippage !== ""
                      ? "text-glaze-400 placeholder:text-glaze-400/50"
                      : "text-corp-100 placeholder:text-corp-500"
                  }`}
                />
                <span className={`text-xs ${customSlippage !== "" ? "text-glaze-400" : "text-corp-400"}`}>%</span>
              </div>
            </div>
          </div>

          {willSwapFail && (
            <div className="text-sm text-yellow-400 text-center py-2 bg-yellow-400/10 rounded-lg px-3">
              Price impact exceeds slippage tolerance. Increase slippage or reduce amount.
            </div>
          )}

          {(swapError || quoteError) && (
            <div className="text-sm text-red-400 text-center py-2">{swapError || quoteError}</div>
          )}
        </div>
      </div>
    </>
  );
}
