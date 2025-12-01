import React, { useState, useEffect } from 'react';
import { DonutLogo } from './DonutLogo';
import { ChevronLeft, ChevronRight, Circle, Video } from 'lucide-react';

interface TVProps {
  uri: string; // Used as an override/alert channel
  glazing?: boolean;
}

// Simulated Factory Feeds
const CHANNELS = [
  { id: 'CAM_01', name: 'MIXING_BAY_A', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000', status: 'LIVE' },
  { id: 'CAM_02', name: 'FRYER_CONTROL', url: 'https://images.unsplash.com/photo-1516937941348-c09e554b9631?auto=format&fit=crop&q=80&w=2000', status: 'LIVE' },
  { id: 'CAM_03', name: 'GLAZING_LINE', url: 'https://images.unsplash.com/photo-1504194921103-f8b80cadd5e4?auto=format&fit=crop&q=80&w=2000', status: 'LIVE' },
  { id: 'CAM_04', name: 'PACKING_DECK', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000', status: 'LIVE' },
  { id: 'CAM_05', name: 'EXTERIOR_S', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000', status: 'LOW_LIGHT' },
];

export const TV: React.FC<TVProps> = ({ uri, glazing }) => {
  const [currentChannel, setCurrentChannel] = useState(0);
  const [isStatic, setIsStatic] = useState(false);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());

  // Clock Effect
  useEffect(() => {
    const t = setInterval(() => setTimestamp(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Channel Switch Logic
  const switchChannel = (direction: 'next' | 'prev') => {
    setIsStatic(true);
    setTimeout(() => {
      setCurrentChannel(prev => {
        if (direction === 'next') return (prev + 1) % CHANNELS.length;
        return (prev - 1 + CHANNELS.length) % CHANNELS.length;
      });
      setIsStatic(false);
    }, 300); // 300ms of static noise
  };

  const activeCam = CHANNELS[currentChannel];

  // If user provides a custom URI (like a mined block message), we override the CCTV
  // But strictly speaking, the user asked to see the factory, so we prioritize the CCTV structure
  // unless "glazing" (mining) is happening.
  
  const showOverride = glazing || (uri && uri !== "CONNECTING TO MAINNET..." && !uri.includes(" ")); 

  return (
    <div className="relative w-full aspect-video bg-[#111] overflow-hidden rounded-md border-[4px] border-[#222] shadow-2xl flex flex-col group">
      
      {/* Screen Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-black">
        
        {/* 1. Main Feed Layer */}
        {!isStatic && (
          <div className="absolute inset-0 w-full h-full">
             {showOverride ? (
                // Override Mode (When Mining or Specific URI set)
                <div className="w-full h-full relative">
                   {uri.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img src={uri} className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 animate-pulse">
                         <DonutLogo className="w-32 h-32 mb-4" />
                         <h2 className="text-2xl font-bold text-brand-pink uppercase tracking-widest">System Override</h2>
                         <p className="text-zinc-500 font-mono text-xs">{uri}</p>
                      </div>
                   )}
                </div>
             ) : (
                // Standard CCTV Mode
                <div className="w-full h-full relative overflow-hidden">
                  <img 
                    src={activeCam.url} 
                    className="w-full h-full object-cover filter contrast-125 brightness-75 sepia-[0.3] grayscale-[0.5] scale-110 animate-[pan_30s_linear_infinite_alternate]"
                    alt="CCTV Feed"
                  />
                  {/* Vignette */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)]"></div>
                </div>
             )}
          </div>
        )}

        {/* 2. Static Noise Layer (Transition Effect) */}
        {(isStatic || !activeCam) && (
           <div className="absolute inset-0 bg-black flex items-center justify-center z-10"
                style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`}}>
               <span className="text-zinc-500 font-mono text-xs bg-black px-2">NO SIGNAL</span>
           </div>
        )}

        {/* 3. Overlay / HUD */}
        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-20">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start">
             <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${glazing ? 'bg-brand-pink animate-ping' : 'bg-red-600 animate-pulse'}`}></div>
                   <span className="font-mono text-red-500 font-bold tracking-widest text-sm shadow-black drop-shadow-md">REC</span>
                </div>
                <span className="font-mono text-zinc-400 text-xs shadow-black drop-shadow-md">{activeCam.id} // {activeCam.name}</span>
             </div>
             <div className="text-right">
                <div className="font-mono text-zinc-300 text-xl font-bold tracking-widest shadow-black drop-shadow-md">{timestamp}</div>
                <div className="font-mono text-zinc-500 text-[10px] uppercase">Frame: 30fps // 1080i</div>
             </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex justify-between items-end">
             <div className="font-mono text-[10px] text-zinc-600 uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                GlazeCorp Security Systems v9.0
             </div>
             {showOverride && (
                <div className="bg-brand-pink/20 border border-brand-pink/50 px-3 py-1 rounded text-brand-pink font-mono text-xs animate-pulse">
                   ⚠ EXTERNAL_INPUT_DETECTED
                </div>
             )}
          </div>
        </div>

        {/* 4. Effects Layers */}
        <div className="scanlines opacity-20 pointer-events-none z-30"></div>
        <div className="absolute inset-0 pointer-events-none z-30 mix-blend-overlay opacity-10" 
             style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`}}>
        </div>

      </div>

      {/* Control Panel (Bezel) */}
      <div className="h-12 bg-[#1a1a1a] border-t border-[#333] flex items-center justify-between px-4 z-40">
         <div className="flex items-center gap-2">
            <Video size={14} className="text-zinc-600" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Source: INT_NET</span>
         </div>
         
         <div className="flex items-center gap-1">
            <button 
              onClick={() => switchChannel('prev')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1 px-2">
               {CHANNELS.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-1.5 h-1.5 rounded-full ${idx === currentChannel ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-zinc-700'}`}
                  ></div>
               ))}
            </div>
            <button 
              onClick={() => switchChannel('next')}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <ChevronRight size={16} />
            </button>
         </div>

         <div className="flex items-center gap-2">
            <Circle size={8} className={`${isStatic ? 'fill-yellow-500 text-yellow-500' : 'fill-green-900 text-green-900'}`} />
            <span className="text-[10px] text-zinc-600 font-mono uppercase">SIGNAL</span>
         </div>
      </div>
      
      {/* CSS Animation for Panning */}
      <style>{`
        @keyframes pan {
          0% { transform: scale(1.1) translate(0, 0); }
          100% { transform: scale(1.1) translate(-2%, -2%); }
        }
      `}</style>
    </div>
  );
};