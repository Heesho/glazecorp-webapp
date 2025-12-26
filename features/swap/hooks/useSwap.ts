"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useBalance, useReadContract, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";
import { parseEther, formatEther, formatUnits } from "viem";

import {
  getKyberQuote,
  buildKyberSwap,
  NATIVE_ETH_ADDRESS,
  type KyberQuoteResponse,
  type SwapToken,
} from "@/lib/api/kyber";
import {
  buildUniV2SwapCalldata,
  getTokenUsdValue,
  getTheoreticalOutput,
  type UniV2Quote,
} from "@/lib/api/uniswapV2";
import { TOKEN_ADDRESSES, ERC20_ABI, LAUNCHPAD_ADDRESSES } from "@/lib/blockchain/contracts";
import { getRigs, fetchRigMetadata, ipfsToHttp, type SubgraphRig } from "@/lib/api/launchpad";

// Base tokens with logos (ETH and DONUT only)
export const BASE_TOKENS: SwapToken[] = [
  {
    address: NATIVE_ETH_ADDRESS,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    address: TOKEN_ADDRESSES.donut,
    symbol: "DONUT",
    name: "Donut",
    decimals: 18,
    logoUrl: "/donut-logo.png", // Local donut logo
  },
];

export type SwapStep = "idle" | "quoting" | "approving" | "swapping" | "confirming";

export function useSwap() {
  const { address: userAddress } = useAccount();

  // Token state
  const [tokenIn, setTokenIn] = useState<SwapToken>(BASE_TOKENS[0]); // ETH
  const [tokenOut, setTokenOut] = useState<SwapToken>(BASE_TOKENS[1]); // DONUT
  const [inputAmount, setInputAmount] = useState("");
  const [franchiseTokens, setFranchiseTokens] = useState<SwapToken[]>([]);

  // Slippage state (in basis points, e.g., 100 = 1%)
  const [slippageBps, setSlippageBps] = useState(100); // Default 1%

  // Quote state
  const [quote, setQuote] = useState<KyberQuoteResponse | null>(null);
  const [uniV2Quote, setUniV2Quote] = useState<UniV2Quote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [calculatedOutputUsd, setCalculatedOutputUsd] = useState<string | null>(null);
  const [calculatedInputUsd, setCalculatedInputUsd] = useState<string | null>(null);
  const [theoreticalOutput, setTheoreticalOutput] = useState<number>(0);

  // Swap state
  const [swapStep, setSwapStep] = useState<SwapStep>("idle");
  const [swapError, setSwapError] = useState<string | null>(null);

  // Transaction
  const { sendTransaction, data: txHash, isPending: isSending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: userAddress,
    chainId: base.id,
  });

  // Get ERC20 token balance for input token
  const { data: tokenInBalance, refetch: refetchTokenInBalance } = useReadContract({
    address: tokenIn.address !== NATIVE_ETH_ADDRESS ? tokenIn.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    chainId: base.id,
    query: {
      enabled: !!userAddress && tokenIn.address !== NATIVE_ETH_ADDRESS,
    },
  });

  // Get ERC20 token balance for output token
  const { data: tokenOutBalance, refetch: refetchTokenOutBalance } = useReadContract({
    address: tokenOut.address !== NATIVE_ETH_ADDRESS ? tokenOut.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    chainId: base.id,
    query: {
      enabled: !!userAddress && tokenOut.address !== NATIVE_ETH_ADDRESS,
    },
  });

  // Get allowance for non-ETH tokens
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn.address !== NATIVE_ETH_ADDRESS ? tokenIn.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress && quote ? [userAddress, quote.routerAddress as Address] : undefined,
    chainId: base.id,
    query: {
      enabled: !!userAddress && !!quote && tokenIn.address !== NATIVE_ETH_ADDRESS,
    },
  });

  // All available tokens
  const allTokens = useMemo(() => [...BASE_TOKENS, ...franchiseTokens], [franchiseTokens]);

  // Fetch franchise tokens with logos on mount
  useEffect(() => {
    async function loadFranchiseTokens() {
      try {
        const rigs = await getRigs(100, 0, "revenue", "desc");
        const rigsWithUnits = rigs.filter((rig) => rig.unit);

        // Fetch metadata for each rig to get logos
        const tokensWithLogos = await Promise.all(
          rigsWithUnits.map(async (rig) => {
            let logoUrl: string | undefined;
            if (rig.uri) {
              try {
                const metadata = await fetchRigMetadata(rig.uri);
                if (metadata?.image) {
                  logoUrl = ipfsToHttp(metadata.image);
                }
              } catch {
                // Ignore metadata fetch errors
              }
            }
            return {
              address: rig.unit,
              symbol: rig.symbol,
              name: rig.name,
              decimals: 18,
              logoUrl,
              lpAddress: rig.lp, // Store LP address for USD calculation
            };
          })
        );

        setFranchiseTokens(tokensWithLogos);
      } catch (error) {
        console.error("Failed to load franchise tokens:", error);
      }
    }
    loadFranchiseTokens();
  }, []);

  // Debounced quote fetching (Kyber only)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        setQuote(null);
        setUniV2Quote(null);
        setCalculatedOutputUsd(null);
        setCalculatedInputUsd(null);
        setTheoreticalOutput(0);
        return;
      }

      setIsQuoting(true);
      setQuoteError(null);
      setCalculatedOutputUsd(null);
      setCalculatedInputUsd(null);
      setTheoreticalOutput(0);

      try {
        const amountInWei = BigInt(Math.floor(parseFloat(inputAmount) * Math.pow(10, tokenIn.decimals)));

        const kyberResult = await getKyberQuote(tokenIn.address, tokenOut.address, amountInWei.toString());

        if (kyberResult?.routeSummary) {
          setQuote(kyberResult);
          setUniV2Quote(null);

          // If Kyber doesn't have USD for output token (franchise tokens), calculate from LP
          const hasOutputUsd = kyberResult.routeSummary.amountOutUsd &&
            parseFloat(kyberResult.routeSummary.amountOutUsd) > 0;

          if (!hasOutputUsd && tokenOut.lpAddress) {
            const outputAmount = parseFloat(formatUnits(BigInt(kyberResult.routeSummary.amountOut), tokenOut.decimals));
            const usdValue = await getTokenUsdValue(tokenOut.lpAddress, tokenOut.address, outputAmount);
            if (usdValue > 0) {
              setCalculatedOutputUsd(usdValue.toFixed(2));
            }
          }

          // If Kyber doesn't have USD for input token (franchise tokens), calculate from LP
          const hasInputUsd = kyberResult.routeSummary.amountInUsd &&
            parseFloat(kyberResult.routeSummary.amountInUsd) > 0;

          if (!hasInputUsd && tokenIn.lpAddress) {
            const inputAmountNum = parseFloat(inputAmount);
            const usdValue = await getTokenUsdValue(tokenIn.lpAddress, tokenIn.address, inputAmountNum);
            if (usdValue > 0) {
              setCalculatedInputUsd(usdValue.toFixed(2));
            }
          }

          // Calculate theoretical output at spot price (no price impact)
          const lpAddress = tokenOut.lpAddress || tokenIn.lpAddress;
          const theoretical = await getTheoreticalOutput(
            tokenIn.address,
            tokenOut.address,
            parseFloat(inputAmount),
            lpAddress
          );
          setTheoreticalOutput(theoretical);
        } else {
          setQuoteError("No route found");
          setQuote(null);
        }
      } catch (err) {
        console.error("Quote error:", err);
        setQuoteError("Failed to get quote");
        setQuote(null);
        setUniV2Quote(null);
      }

      setIsQuoting(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputAmount, tokenIn, tokenOut]);

  // Format balances
  const formattedBalance = useMemo(() => {
    if (tokenIn.address === NATIVE_ETH_ADDRESS) {
      return ethBalance ? formatEther(ethBalance.value) : "0";
    }
    return tokenInBalance ? formatUnits(tokenInBalance as bigint, tokenIn.decimals) : "0";
  }, [tokenIn, ethBalance, tokenInBalance]);

  const formattedBalanceOut = useMemo(() => {
    if (tokenOut.address === NATIVE_ETH_ADDRESS) {
      return ethBalance ? formatEther(ethBalance.value) : "0";
    }
    return tokenOutBalance ? formatUnits(tokenOutBalance as bigint, tokenOut.decimals) : "0";
  }, [tokenOut, ethBalance, tokenOutBalance]);

  // Output amount from quote
  const outputAmount = useMemo(() => {
    if (uniV2Quote) {
      return formatUnits(uniV2Quote.amountOut, tokenOut.decimals);
    }
    if (quote?.routeSummary) {
      return formatUnits(BigInt(quote.routeSummary.amountOut), tokenOut.decimals);
    }
    return "";
  }, [quote, uniV2Quote, tokenOut]);

  // Price impact from quote (Kyber or UniV2)
  const priceImpact = useMemo(() => {
    if (uniV2Quote) return uniV2Quote.priceImpact;

    // Calculate from USD values (Kyber or our calculated values)
    if (quote?.routeSummary) {
      // Use Kyber values if available, otherwise use our calculated values
      let amountInUsd = parseFloat(quote.routeSummary.amountInUsd || "0");
      let amountOutUsd = parseFloat(quote.routeSummary.amountOutUsd || "0");

      // Fall back to calculated values for franchise tokens
      if (amountInUsd <= 0 && calculatedInputUsd) {
        amountInUsd = parseFloat(calculatedInputUsd);
      }
      if (amountOutUsd <= 0 && calculatedOutputUsd) {
        amountOutUsd = parseFloat(calculatedOutputUsd);
      }

      if (amountInUsd > 0 && amountOutUsd > 0) {
        // Price impact = how much value is lost in the swap
        const impact = ((amountInUsd - amountOutUsd) / amountInUsd) * 100;
        return Math.max(0, impact); // Don't show negative impact
      }
    }
    return 0;
  }, [uniV2Quote, quote, calculatedInputUsd, calculatedOutputUsd]);

  // Calculate minimum received based on theoretical output and slippage
  const minReceived = useMemo(() => {
    if (theoreticalOutput > 0) {
      return theoreticalOutput * (1 - slippageBps / 10000);
    }
    // Fall back to quoted output if no theoretical output available
    if (outputAmount && parseFloat(outputAmount) > 0) {
      return parseFloat(outputAmount) * (1 - slippageBps / 10000);
    }
    return 0;
  }, [theoreticalOutput, outputAmount, slippageBps]);

  // Check if price impact exceeds slippage tolerance (swap will fail)
  const willSwapFail = useMemo(() => {
    if (!quote?.routeSummary || theoreticalOutput <= 0) return false;
    const quotedOutput = parseFloat(formatUnits(BigInt(quote.routeSummary.amountOut), tokenOut.decimals));
    // If quoted output is less than minReceived, the swap will fail
    return quotedOutput < minReceived;
  }, [quote, theoreticalOutput, minReceived, tokenOut.decimals]);

  // Check if approval needed
  const needsApproval = useMemo(() => {
    if (tokenIn.address === NATIVE_ETH_ADDRESS) return false;
    if (!quote && !uniV2Quote) return false;
    if (!inputAmount) return false;
    const amountInWei = BigInt(Math.floor(parseFloat(inputAmount) * Math.pow(10, tokenIn.decimals)));
    return (allowance as bigint || 0n) < amountInWei;
  }, [tokenIn, quote, uniV2Quote, inputAmount, allowance]);

  // Flip tokens
  const handleFlip = useCallback(() => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setInputAmount("");
    setQuote(null);
    setUniV2Quote(null);
  }, [tokenIn, tokenOut]);

  // Set max amount
  const handleSetMax = useCallback(() => {
    const balance = parseFloat(formattedBalance);
    if (tokenIn.address === NATIVE_ETH_ADDRESS) {
      // Leave some for gas
      setInputAmount(Math.max(0, balance - 0.001).toFixed(6));
    } else {
      setInputAmount(balance.toString());
    }
  }, [formattedBalance, tokenIn]);

  // Approve token
  const handleApprove = useCallback(async () => {
    if ((!quote && !uniV2Quote) || !userAddress) return;

    setSwapStep("approving");
    setSwapError(null);

    try {
      const amountInWei = BigInt(Math.floor(parseFloat(inputAmount) * Math.pow(10, tokenIn.decimals)));

      // Use UniV2 router for DONUT swaps, Kyber router otherwise
      const spender = uniV2Quote
        ? LAUNCHPAD_ADDRESSES.uniV2Router
        : (quote?.routerAddress ?? "");

      sendTransaction(
        {
          to: tokenIn.address as Address,
          data: `0x095ea7b3${spender.slice(2).padStart(64, "0")}${amountInWei.toString(16).padStart(64, "0")}` as `0x${string}`,
          chainId: base.id,
        },
        {
          onSuccess: () => {
            // Transaction submitted, wait for confirmation
            // The useEffect below will handle when isSuccess becomes true
          },
          onError: (error) => {
            console.error("Approve error:", error);
            setSwapStep("idle");
            setSwapError("Approval failed");
          },
        }
      );
    } catch (error) {
      console.error("Approve error:", error);
      setSwapStep("idle");
      setSwapError("Approval failed");
    }
  }, [quote, uniV2Quote, userAddress, inputAmount, tokenIn, sendTransaction, refetchAllowance]);

  // Execute swap
  const handleSwap = useCallback(async () => {
    if ((!quote && !uniV2Quote) || !userAddress) return;

    setSwapStep("swapping");
    setSwapError(null);

    try {
      // Handle UniV2 swaps for DONUT
      if (uniV2Quote) {
        const isEthIn = tokenIn.address === NATIVE_ETH_ADDRESS;
        const swapData = buildUniV2SwapCalldata(
          uniV2Quote,
          userAddress as Address,
          slippageBps,
          isEthIn
        );

        sendTransaction(
          {
            to: swapData.to,
            data: swapData.data,
            value: swapData.value,
            chainId: base.id,
          },
          {
            onSuccess: () => {
              setSwapStep("confirming");
            },
            onError: (error) => {
              console.error("Swap error:", error);
              setSwapStep("idle");
              setSwapError("Swap failed");
            },
          }
        );
        return;
      }

      // Handle Kyber swaps for other tokens
      if (!quote?.routeSummary || !quote?.routerAddress) {
        setSwapStep("idle");
        setSwapError("Invalid quote");
        return;
      }

      // Calculate effective slippage to pass to Kyber
      // This ensures Kyber's minAmountOut matches our calculated minReceived
      let effectiveSlippageBps = slippageBps;
      if (minReceived > 0) {
        const quotedOutput = parseFloat(formatUnits(BigInt(quote.routeSummary.amountOut), tokenOut.decimals));
        if (quotedOutput > 0) {
          // effectiveSlippage = 1 - (minReceived / quotedOutput)
          effectiveSlippageBps = Math.max(0, Math.round((1 - minReceived / quotedOutput) * 10000));
        }
      }

      const buildResult = await buildKyberSwap(
        quote.routeSummary,
        quote.routerAddress,
        userAddress,
        userAddress,
        effectiveSlippageBps
      );

      if (!buildResult?.data) {
        setSwapStep("idle");
        setSwapError("Failed to build swap");
        return;
      }

      const value = tokenIn.address === NATIVE_ETH_ADDRESS
        ? BigInt(quote.routeSummary.amountIn)
        : 0n;

      sendTransaction(
        {
          to: buildResult.data.routerAddress as Address,
          data: buildResult.data.data as `0x${string}`,
          value,
          chainId: base.id,
        },
        {
          onSuccess: () => {
            setSwapStep("confirming");
          },
          onError: (error) => {
            console.error("Swap error:", error);
            setSwapStep("idle");
            setSwapError("Swap failed");
          },
        }
      );
    } catch (error) {
      console.error("Swap error:", error);
      setSwapStep("idle");
      setSwapError("Swap failed");
    }
  }, [quote, uniV2Quote, userAddress, tokenIn, tokenOut.decimals, sendTransaction, slippageBps, minReceived]);

  // Handle transaction confirmation (both approval and swap)
  useEffect(() => {
    if (isSuccess) {
      if (swapStep === "approving") {
        // Approval confirmed - refetch allowance multiple times
        setSwapStep("idle");
        refetchAllowance();
        setTimeout(() => refetchAllowance(), 1000);
        setTimeout(() => refetchAllowance(), 2000);
        setTimeout(() => refetchAllowance(), 4000);
      } else if (swapStep === "confirming") {
        // Swap confirmed - refetch balances multiple times
        setSwapStep("idle");
        setInputAmount("");
        setQuote(null);
        setUniV2Quote(null);

        const refetchAll = () => {
          refetchTokenInBalance();
          refetchTokenOutBalance();
        };

        refetchAll();
        setTimeout(refetchAll, 1000);
        setTimeout(refetchAll, 3000);
        setTimeout(refetchAll, 6000);
      }
    }
  }, [isSuccess, swapStep, refetchTokenInBalance, refetchTokenOutBalance, refetchAllowance]);

  const isBusy = swapStep !== "idle" || isSending || isConfirming;

  // Has any quote (Kyber or UniV2)
  const hasQuote = !!(quote || uniV2Quote);

  return {
    // Tokens
    tokenIn,
    tokenOut,
    setTokenIn,
    setTokenOut,
    allTokens,
    handleFlip,

    // Amounts
    inputAmount,
    setInputAmount,
    outputAmount,
    formattedBalance,
    formattedBalanceOut,
    handleSetMax,

    // Quote
    quote,
    uniV2Quote,
    hasQuote,
    isQuoting,
    quoteError,
    priceImpact,
    calculatedOutputUsd,
    calculatedInputUsd,

    // Swap
    swapStep,
    swapError,
    isBusy,
    needsApproval,
    handleApprove,
    handleSwap,

    // Slippage
    slippageBps,
    setSlippageBps,

    // Minimum received (based on theoretical output at spot price)
    minReceived,
    theoreticalOutput,
    willSwapFail,
  };
}
