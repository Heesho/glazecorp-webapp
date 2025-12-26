"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, AreaSeries } from "lightweight-charts";

interface PricePoint {
  time: number;
  value: number;
}

interface PriceChartProps {
  data: PricePoint[];
  isLoading?: boolean;
  color?: string;
  height?: number;
}

export function PriceChart({
  data,
  isLoading = false,
  color = "#ec4899",
  height = 200
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight || height;

    if (containerWidth === 0) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    // Create chart
    const chart = createChart(container, {
      width: containerWidth,
      height: containerHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
      },
      timeScale: {
        visible: true,
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "#ec489950",
          width: 1,
          style: 2,
          labelBackgroundColor: "#ec4899",
        },
        horzLine: {
          color: "#ec489950",
          width: 1,
          style: 2,
          labelBackgroundColor: "#ec4899",
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Add area series
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}40`,
      bottomColor: `${color}05`,
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 6,
        minMove: 0.000001,
      },
    });

    seriesRef.current = areaSeries;

    // Set data
    if (data && data.length > 0) {
      const sortedData = [...data].sort((a, b) => a.time - b.time);
      areaSeries.setData(sortedData.map(p => ({ time: p.time as any, value: p.value })));
      chart.timeScale().fitContent();
    }

    return chart;
  }, [data, height, color]);

  // Initialize chart when mounted and data is available
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Small delay to ensure container is rendered
    const timer = setTimeout(() => {
      initChart();
    }, 50);

    return () => {
      clearTimeout(timer);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [data, initChart]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const containerHeight = containerRef.current.clientHeight || height;
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [height]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-zinc-900/50 rounded"
        style={{ height }}
      >
        <div className="text-zinc-600 text-xs font-mono animate-pulse">Loading chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-zinc-900/50 rounded"
        style={{ height }}
      >
        <div className="text-zinc-600 text-xs font-mono">No chart data</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: height, height: "100%" }}
    />
  );
}
