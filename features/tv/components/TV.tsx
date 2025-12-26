"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { DonutLogo } from "@/components/ui";
import { CHANNELS, CHANNEL_SWITCH_DELAY_MS, OVERRIDE_DISPLAY_DURATION_MS } from "@/config/constants";

interface TVProps {
  uri: string;
  glazing?: boolean;
  overrideAvatar?: string;
}

export function TV({ uri, glazing, overrideAvatar }: TVProps) {
  const [currentChannel, setCurrentChannel] = useState(0);
  const [isStatic, setIsStatic] = useState(false);
  const [timestamp, setTimestamp] = useState("--:--:--");
  const [showOverrideScreen, setShowOverrideScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Initialize clock on client
  useEffect(() => {
    setTimestamp(new Date().toLocaleTimeString());
    const timer = setInterval(() => setTimestamp(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show override screen when glazing starts
  useEffect(() => {
    if (glazing) {
      setShowOverrideScreen(true);
      const timer = setTimeout(() => setShowOverrideScreen(false), OVERRIDE_DISPLAY_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [glazing]);

  const handleVideoEnded = () => {
    if (!showOverrideScreen) {
      switchChannel("next");
    }
  };

  const switchChannel = (direction: "next" | "prev") => {
    setIsStatic(true);
    setTimeout(() => {
      setCurrentChannel((prev) => {
        if (direction === "next") return (prev + 1) % CHANNELS.length;
        return (prev - 1 + CHANNELS.length) % CHANNELS.length;
      });
      setIsStatic(false);
    }, CHANNEL_SWITCH_DELAY_MS);
  };

  const activeCam = CHANNELS[currentChannel];
  const isImageUri = uri?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  return (
    <div className="relative w-full h-full bg-corp-950">
      {/* Screen Container */}
      <div className="relative w-full h-full overflow-hidden bg-black">
        {/* Main Feed Layer */}
        {!isStatic && (
          <div className="absolute inset-0 w-full h-full">
            {showOverrideScreen ? (
              <OverrideScreen uri={uri} overrideAvatar={overrideAvatar} isImageUri={!!isImageUri} />
            ) : (
              <VideoFeed
                channel={activeCam}
                currentChannel={currentChannel}
                isMuted={isMuted}
                onVideoEnded={handleVideoEnded}
              />
            )}
          </div>
        )}

        {/* Static Noise Layer */}
        {(isStatic || !activeCam) && <StaticNoise />}

        {/* HUD Overlay with Controls */}
        <HUDOverlay
          activeCam={activeCam}
          timestamp={timestamp}
          glazing={glazing}
          showOverride={showOverrideScreen}
          currentChannel={currentChannel}
          isStatic={isStatic}
          isMuted={isMuted}
          onSwitchChannel={switchChannel}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      </div>
    </div>
  );
}

// Sub-components

function OverrideScreen({
  uri,
  overrideAvatar,
  isImageUri,
}: {
  uri: string;
  overrideAvatar?: string;
  isImageUri: boolean;
}) {
  if (isImageUri) {
    return <img src={uri} className="w-full h-full object-cover" alt="Override" />;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-corp-950">
      {overrideAvatar ? (
        <img
          src={overrideAvatar}
          className="w-20 h-20 rounded-full border-2 border-glaze-500 shadow-lg shadow-glaze-500/30 mb-4"
          alt="Avatar"
        />
      ) : (
        <DonutLogo className="w-20 h-20 mb-4" />
      )}
      <h2 className="text-lg font-semibold text-glaze-400">
        Glazing...
      </h2>
      <p className="text-corp-500 text-sm mt-1 max-w-xs text-center truncate px-4">{uri || "Processing"}</p>
    </div>
  );
}

function VideoFeed({
  channel,
  currentChannel,
  isMuted,
  onVideoEnded,
}: {
  channel: (typeof CHANNELS)[number];
  currentChannel: number;
  isMuted: boolean;
  onVideoEnded: () => void;
}) {
  if (channel.isVideo) {
    return (
      <video
        key={currentChannel}
        src={channel.url}
        className="w-full h-full object-cover"
        autoPlay
        muted={isMuted}
        playsInline
        onEnded={onVideoEnded}
      />
    );
  }

  return (
    <img
      src={channel.url}
      className="w-full h-full object-cover"
      alt="Feed"
    />
  );
}

function StaticNoise() {
  return (
    <div
      className="absolute inset-0 bg-corp-950 flex items-center justify-center z-10"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
      }}
    >
      <span className="text-corp-500 text-sm">Switching...</span>
    </div>
  );
}

function HUDOverlay({
  activeCam,
  timestamp,
  glazing,
  showOverride,
  currentChannel,
  isStatic,
  isMuted,
  onSwitchChannel,
  onToggleMute,
}: {
  activeCam: (typeof CHANNELS)[number];
  timestamp: string;
  glazing?: boolean;
  showOverride: boolean;
  currentChannel: number;
  isStatic: boolean;
  isMuted: boolean;
  onSwitchChannel: (direction: "next" | "prev") => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="absolute inset-0 p-4 flex flex-col justify-between z-20">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          <div
            className={`w-2 h-2 rounded-full ${glazing ? "bg-glaze-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-white text-xs font-medium">
            {activeCam.name.replace(/_/g, " ")}
          </span>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          <span className="text-white text-sm font-medium tabular-nums">
            {timestamp}
          </span>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex justify-between items-end">
        <div className="pointer-events-none">
          {showOverride && (
            <div className="bg-glaze-500/20 backdrop-blur-sm border border-glaze-500/30 px-3 py-1.5 rounded-lg">
              <span className="text-glaze-400 text-xs font-medium">Processing glaze...</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg p-1">
          <button
            onClick={() => onSwitchChannel("prev")}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1 px-1">
            {CHANNELS.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentChannel ? "bg-glaze-500" : "bg-white/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => onSwitchChannel("next")}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button
            onClick={onToggleMute}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

