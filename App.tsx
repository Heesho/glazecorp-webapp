import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { 
  Terminal, ShieldAlert, Zap,
  LayoutGrid, BarChart3, Users,
  Activity, Radio, DollarSign, Wallet
} from 'lucide-react';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TV } from './components/TV';
import { DonutLogo } from './components/DonutLogo';
import { 
  fetchMinerState, 
  fetchFarcasterProfile,
  fetchFarcasterProfiles, 
  fetchGraphData,
  fetchEthPrice,
  calculateDutchAuctionPrice,
  formatEth,
  formatDonut,
  truncateAddress,
  MULTICALL_ADDRESS,
  MULTICALL_ABI
} from './utils';
import { MinerState, FarcasterProfile, FeedItem, GraphStat } from './types';

// Default State
const INITIAL_STATE: MinerState = {
  epochId: 0,
  initPrice: 0n,
  startTime: Math.floor(Date.now()/1000),
  glazed: 0n,
  price: 0n,
  dps: 0n,
  nextDps: 0n,
  donutPrice: 0n,
  miner: ethers.ZeroAddress,
  uri: "CONNECTING TO MAINNET...",
  ethBalance: 0n,
  donutBalance: 0n,
  wethBalance: 0n
};

type TabView = 'TERMINAL' | 'AUCTIONS';

const App: React.FC = () => {
  // -- Data State --
  const [minerState, setMinerState] = useState<MinerState>(INITIAL_STATE);
  const [kingProfile, setKingProfile] = useState<FarcasterProfile | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedProfiles, setFeedProfiles] = useState<Record<string, FarcasterProfile>>({});
  const [stats, setStats] = useState({ revenue: '0', minted: '0' });
  const [userGraphStats, setUserGraphStats] = useState<GraphStat | null>(null);
  const [ethPrice, setEthPrice] = useState<number>(0);
  
  // -- UI State --
  const [activeTab, setActiveTab] = useState<TabView>('TERMINAL');
  const [currentPrice, setCurrentPrice] = useState<bigint>(0n);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isGlazing, setIsGlazing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [halvingDisplay, setHalvingDisplay] = useState("--d --h --m --s");

  // -- Refs --
  
  // Initialize halving target (mocking ~142 days from load for visual)
  const halvingTargetRef = useRef(Date.now() + (142 * 24 * 60 * 60 * 1000) + (11 * 60 * 60 * 1000) + (59 * 60 * 1000) + 49000);

  // 1. Polling Cycle (Data)
  useEffect(() => {
    const refresh = async () => {
      const addr = userAddress || ethers.ZeroAddress;
      
      // A. Contract State
      const state = await fetchMinerState(addr);
      if (state) {
        setMinerState(state);
        if (state.miner !== minerState.miner) {
          const profile = await fetchFarcasterProfile(state.miner);
          setKingProfile(profile);
        }
      }

      // B. Graph Data
      const graphData = await fetchGraphData(addr);
      if (graphData) {
        if (graphData.miners?.[0]) {
          setStats(graphData.miners[0]);
        }
        if (graphData.miner) {
          setUserGraphStats(graphData.miner);
        }
        if (graphData.glazes) {
          const formattedFeed = graphData.glazes.map((g: any) => ({
            id: g.id,
            miner: g.account?.id || ethers.ZeroAddress,
            uri: g.uri,
            timestamp: Number(g.startTime),
            price: g.initPrice
          }));
          setFeed(formattedFeed);
        }
      }

      // C. ETH Price
      const price = await fetchEthPrice();
      if (price > 0) setEthPrice(price);
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [userAddress, minerState.miner]); 

  // 2. Fetch Profiles for Feed
  useEffect(() => {
    const loadProfiles = async () => {
       const addressesToFetch = feed
         .map(f => f.miner)
         .filter(addr => addr && !feedProfiles[addr.toLowerCase()]);
       
       if (addressesToFetch.length > 0) {
         const newProfiles = await fetchFarcasterProfiles(addressesToFetch);
         setFeedProfiles(prev => ({ ...prev, ...newProfiles }));
       }
    };
    if (feed.length > 0) loadProfiles();
  }, [feed]);

  // 4. Fast Cycle (Ticker & Countdown)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());

      // Update Price
      const price = calculateDutchAuctionPrice(minerState.initPrice, minerState.startTime);
      setCurrentPrice(price);

      // Update Halving Countdown
      const diff = halvingTargetRef.current - Date.now();
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setHalvingDisplay(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setHalvingDisplay("IMMINENT");
      }
    }, 100);
    return () => clearInterval(timer);
  }, [minerState.initPrice, minerState.startTime]);

  // -- Handlers --
  const connectWallet = async () => {
    setConnectionError(null);
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setUserAddress(await signer.getAddress());
      } catch (e: any) {
        console.error("Connection failed", e);
        setConnectionError("Wallet connection failed or rejected.");
      }
    } else {
      setConnectionError("No wallet detected. Please install a Web3 wallet.");
    }
  };

  const handleGlaze = async () => {
    if (!userAddress || !window.ethereum) return;
    setIsGlazing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, signer);

      const epochId = minerState.epochId;
      const deadline = Math.floor(Date.now()/1000) + 300;
      const priceVal = BigInt(currentPrice);
      const valueToSend = priceVal + (priceVal / 10n);
      const shopAddress = "0x0000000000000000000000000000000000000000"; 

      const tx = await contract.mine(
        shopAddress,
        epochId,
        deadline,
        valueToSend,
        message || "Glazed.",
        { value: valueToSend }
      );
      
      await tx.wait();
      setMessage("");
      const state = await fetchMinerState(userAddress);
      if(state) setMinerState(state);

    } catch (e: any) {
      console.error(e);
      setConnectionError("Transaction Failed: " + (e.reason || e.message || "Unknown error"));
    } finally {
      setIsGlazing(false);
    }
  };

  // -- Safe Derived Metrics --
  const safeDps = minerState?.dps ? BigInt(minerState.dps) : 0n;
  const safeDonutPrice = minerState?.donutPrice ? BigInt(minerState.donutPrice) : 0n;
  
  const elapsedSeconds = BigInt(Math.max(0, Math.floor(now / 1000) - Number(minerState.startTime)));
  const accruedDonutsWei = elapsedSeconds * safeDps;
  const accruedDonutsStr = formatDonut(accruedDonutsWei);
  
  const accruedValueWei = (accruedDonutsWei * safeDonutPrice) / 1000000000000000000n;
  const accruedValueEthNum = parseFloat(ethers.formatEther(accruedValueWei));
  const accruedValueUsdStr = (accruedValueEthNum * ethPrice).toFixed(2);

  const costWei = minerState?.price ? BigInt(minerState.price) : 0n;
  const costEthNum = parseFloat(ethers.formatEther(costWei));
  
  const pnlEthNum = accruedValueEthNum - costEthNum;
  const pnlSign = pnlEthNum < 0 ? "-" : "+";
  const pnlEthStr = `${pnlSign}Ξ${Math.abs(pnlEthNum).toFixed(5)}`;
  
  const pnlUsdNum = pnlEthNum * ethPrice;
  const pnlUsdSign = pnlUsdNum < 0 ? "-" : "+";
  const pnlUsdStr = `${pnlUsdSign}$${Math.abs(pnlUsdNum).toFixed(2)}`;

  const dpsEthWei = (safeDps * safeDonutPrice) / 1000000000000000000n;
  const dpsUsd = parseFloat(ethers.formatEther(dpsEthWei)) * ethPrice;
  
  const currentPriceEth = parseFloat(ethers.formatEther(currentPrice));
  const currentPriceUsd = currentPriceEth * ethPrice;

  const donutPriceEth = parseFloat(ethers.formatEther(safeDonutPrice));
  const donutPriceUsd = donutPriceEth * ethPrice;

  return (
    <div className="h-full w-full flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="h-16 border-b border-white/5 bg-black/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
             <DonutLogo className="w-8 h-8 animate-spin-slow" />
             <div>
                <h1 className="font-bold text-xl tracking-tight text-white leading-none">
                  GLAZE<span className="text-brand-pink">CORP</span>
                </h1>
                <div className="text-[9px] font-mono text-zinc-500 tracking-[0.3em] uppercase">Donut Miner Protocol</div>
             </div>
          </div>

          {/* Tabs */}
          <nav className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
             <button 
               onClick={() => setActiveTab('TERMINAL')}
               className={`px-4 py-1.5 text-xs font-bold font-mono rounded transition-all flex items-center gap-2 ${activeTab === 'TERMINAL' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Terminal size={12} />
               TERMINAL
             </button>
             <button 
               onClick={() => setActiveTab('AUCTIONS')}
               className={`px-4 py-1.5 text-xs font-bold font-mono rounded transition-all flex items-center gap-2 ${activeTab === 'AUCTIONS' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <LayoutGrid size={12} />
               AUCTIONS
             </button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
           {/* Socials / External */}
           <div className="hidden lg:flex items-center gap-4 text-zinc-500">
              <a href="https://dune.com/xyk/donut-company?theme=dark" target="_blank" rel="noopener" className="hover:text-brand-pink transition-colors"><BarChart3 size={18} /></a>
              <a href="https://farcaster.xyz/~/channel/donut" target="_blank" rel="noopener" className="hover:text-brand-pink transition-colors"><Users size={18} /></a>
           </div>

           {/* Wallet */}
           {!userAddress ? (
             <Button variant="primary" onClick={connectWallet} className="!py-2 !px-5 !text-xs">
               Connect Wallet
             </Button>
           ) : (
             <div className="flex items-center gap-3 bg-zinc-900/50 border border-brand-pink/20 rounded-full pl-4 pr-1 py-1">
               <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider">{truncateAddress(userAddress)}</span>
               <div className="h-6 w-6 rounded-full bg-brand-pink/20 flex items-center justify-center border border-brand-pink/40">
                  <Wallet size={12} className="text-brand-pink" />
               </div>
             </div>
           )}
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 p-4 lg:p-6 min-h-0 overflow-hidden relative z-10">
        
        {activeTab === 'TERMINAL' ? (
          <div className="grid grid-cols-12 gap-6 h-full min-h-0">
            
            {/* --- COLUMN 1: INTEL --- */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 min-h-0 h-full">
              
              {/* CURRENT OPERATOR */}
              <Card 
                variant="cyber" 
                title="CURRENT_OPERATOR" 
                icon={<ShieldAlert size={14}/>}
                className="shrink-0"
              >
                <div className="flex flex-col gap-6">
                  {/* Top: Avatar & Info */}
                  <div className="flex items-center gap-4">
                    {/* Avatar Display */}
                    <div className="shrink-0 relative">
                       {kingProfile?.pfp ? (
                        <img src={kingProfile.pfp} className="w-14 h-14 rounded-lg border border-brand-pink/30 shadow-[0_0_15px_rgba(236,72,153,0.2)] object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-brand-pink/10 flex items-center justify-center border border-brand-pink/30 text-brand-pink shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                          <Zap size={24} />
                        </div>
                      )}
                      {/* Active Indicator */}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full animate-pulse"></div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                       <div className="flex justify-between items-start">
                           <div className="flex flex-col min-w-0 mr-2">
                              <div className="text-base font-bold text-white truncate font-mono tracking-tight">
                                {kingProfile?.displayName || truncateAddress(minerState.miner)}
                              </div>
                              <div className="text-xs text-zinc-500 font-mono truncate">
                                @{kingProfile?.username || "unknown"}
                              </div>
                           </div>
                       </div>
                    </div>
                  </div>

                  {/* Stats Rows */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-black/20 rounded border border-white/5 hover:border-white/10 transition-colors">
                       <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Glazed</span>
                       <div className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                             <DonutLogo className="w-3 h-3" />
                             <div className="text-sm font-bold text-white font-mono">{accruedDonutsStr}</div>
                          </div>
                          <div className="text-[10px] text-zinc-600 font-mono">${accruedValueUsdStr}</div>
                       </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/20 rounded border border-white/5 hover:border-white/10 transition-colors">
                       <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Current PNL</span>
                       <div className="text-right">
                          <div className="text-sm font-bold font-mono text-white">
                            {pnlEthStr}
                          </div>
                          <div className="text-[10px] text-zinc-600 font-mono">{pnlUsdStr}</div>
                       </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* SURVEILLANCE LOG */}
              <Card 
                className="flex-1 min-h-0" 
                title="SURVEILLANCE_LOG" 
                variant="cyber"
                noPadding
              >
                <div className="flex-1 flex flex-col-reverse overflow-y-auto custom-scrollbar p-2 space-y-1.5 space-y-reverse">
                  {feed.map((item, index) => {
                    const minerAddr = item.miner ? item.miner.toLowerCase() : '';
                    const profile = minerAddr ? feedProfiles[minerAddr] : null;
                    const messageContent = (!item.uri || item.uri.trim().length === 0) ? "System Override" : item.uri;
                    let displayPrice = "0.000";
                    try { displayPrice = formatEth(BigInt(item.price), 3); } catch(e) {}
                    const isLatest = index === 0; // Feed is already desc, so 0 is latest

                    return (
                      <div 
                        key={item.id} 
                        className={`
                          p-2.5 rounded border transition-all duration-300 shrink-0
                          ${isLatest 
                             ? 'bg-brand-pink/10 border-brand-pink/30 shadow-[0_0_15px_rgba(236,72,153,0.15)]' 
                             : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                          }
                        `}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${isLatest ? 'text-brand-pink' : 'text-zinc-500'}`}>
                               {profile?.username || truncateAddress(item.miner)}
                            </span>
                            <span className="font-mono text-[9px] text-zinc-600">Ξ{displayPrice}</span>
                         </div>
                         <div className={`text-xs font-mono leading-relaxed break-words ${isLatest ? 'text-white' : 'text-zinc-400'}`}>
                           <span className="opacity-50 mr-1">&gt;</span>{messageContent}
                         </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* --- COLUMN 2: MAIN VIEWPORT --- */}
            <div className="col-span-12 lg:col-span-6 h-full flex flex-col gap-6 min-h-0">
              
              {/* TV FRAME */}
              <div className="relative shrink-0 w-full group">
                 {/* Decorative top bracket */}
                 <div className="absolute -top-3 left-0 w-full flex justify-between px-1">
                    <div className="w-1/3 h-2 border-t border-l border-zinc-800 rounded-tl"></div>
                    <div className="w-1/3 h-2 border-t border-r border-zinc-800 rounded-tr"></div>
                 </div>
                 
                 <div className="bg-black rounded border border-zinc-800 p-1 shadow-2xl relative z-10">
                    <TV uri={minerState.uri} glazing={isGlazing} />
                 </div>

                 {/* Decorative bottom bracket */}
                 <div className="absolute -bottom-3 left-0 w-full flex justify-between px-1">
                    <div className="w-1/3 h-2 border-b border-l border-zinc-800 rounded-bl"></div>
                    <div className="w-1/3 h-2 border-b border-r border-zinc-800 rounded-br"></div>
                 </div>
              </div>

              {/* CONTROLS */}
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="grid grid-cols-2 gap-4 shrink-0">
                   <Card variant="cyber" className="justify-center" noPadding>
                      <div className="p-4 flex flex-col items-center text-center">
                         <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-1">Current Glaze Rate</div>
                         <div className="text-3xl font-bold font-mono text-white tracking-tighter flex items-center gap-2">
                           <DonutLogo className="w-6 h-6" />
                           {formatDonut(safeDps)} <span className="text-sm text-zinc-600">/s</span>
                         </div>
                         <div className="text-[10px] font-mono text-zinc-600 mt-1">${dpsUsd.toFixed(4)}/s</div>
                      </div>
                   </Card>
                   
                   <Card variant="cyber" className="justify-center" noPadding>
                      <div className="p-4 flex flex-col items-center text-center">
                         <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest mb-1">Current Glaze Price</div>
                         <div className="text-3xl font-bold font-mono text-brand-pink tracking-tighter shadow-brand-pink drop-shadow-sm">
                           Ξ {currentPriceEth.toFixed(4)}
                         </div>
                         <div className="text-[10px] font-mono text-zinc-600 mt-1">${currentPriceUsd.toFixed(2)}</div>
                      </div>
                   </Card>
                </div>

                <Card variant="cyber" className="flex-1 min-h-0" noPadding>
                   <div className="h-full flex flex-col justify-end p-5 gap-4 relative">
                       <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none text-brand-pink">
                         <Terminal size={120} />
                       </div>
                       
                       <div className="relative z-10 flex items-center gap-3 bg-black/40 border border-white/10 rounded px-3 py-3 focus-within:border-brand-pink/50 transition-colors">
                          <span className="text-brand-pink font-mono text-lg animate-pulse">_</span>
                          <input 
                              type="text" 
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="ENTER PROTOCOL MESSAGE..."
                              className="w-full bg-transparent border-none text-sm font-mono text-white placeholder:text-zinc-700 focus:outline-none uppercase tracking-wider"
                              maxLength={200}
                              spellCheck={false}
                            />
                       </div>

                       <Button 
                         variant="primary" 
                         fullWidth 
                         onClick={handleGlaze} 
                         disabled={isGlazing || !userAddress || connectionError !== null}
                         className="h-14 !text-xl !rounded-sm !font-black tracking-widest shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] shrink-0"
                       >
                         {isGlazing ? "PROCESSING..." : "INITIATE GLAZE SEQUENCE"}
                       </Button>
                       
                       {connectionError && (
                         <div className="text-xs text-red-500 font-mono text-center">{connectionError}</div>
                       )}
                   </div>
                </Card>
              </div>

            </div>

            {/* --- COLUMN 3: STATS --- */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 min-h-0 h-full">
               
               {/* GLOBAL STATS */}
               <Card title="GLOBAL_METRICS" variant="cyber">
                  <div className="space-y-4">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <Activity size={12} className="text-brand-pink" />
                           <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Mined</span>
                        </div>
                        <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
                           <DonutLogo className="w-5 h-5" />
                           {parseFloat(stats.minted).toLocaleString()}
                        </div>
                     </div>
                     <div className="h-px bg-white/5 w-full"></div>
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <DollarSign size={12} className="text-brand-pink" />
                           <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Donut Price</span>
                        </div>
                        <div className="text-xl font-bold font-mono text-zinc-300 tracking-tight">
                           ${donutPriceUsd.toFixed(6)}
                        </div>
                     </div>
                     <div className="h-px bg-white/5 w-full"></div>
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                           <Radio size={12} className="text-brand-pink" />
                           <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Next Halving</span>
                        </div>
                        <div className="text-base font-bold font-mono text-zinc-400 tracking-tight">
                           {halvingDisplay}
                        </div>
                     </div>
                  </div>
               </Card>

               {/* USER METRICS */}
               <Card title="USER_METRICS" variant="cyber" className="flex-1">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 content-start h-full">
                     
                     {/* COL 1: BALANCES */}
                     <div className="space-y-6">
                        <div className="space-y-1">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Donut Balance</span>
                            <div className="text-lg font-bold font-mono text-white tracking-tight truncate flex items-center gap-2">
                               <DonutLogo className="w-4 h-4" />
                               {formatDonut(minerState.donutBalance)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">ETH Balance</span>
                            <div className="text-lg font-bold font-mono text-zinc-300 tracking-tight truncate">
                               Ξ {formatEth(minerState.ethBalance, 4)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">WETH Balance</span>
                            <div className="text-lg font-bold font-mono text-zinc-300 tracking-tight truncate">
                               Ξ {formatEth(minerState.wethBalance, 4)}
                            </div>
                        </div>
                     </div>

                     {/* COL 2: PERFORMANCE */}
                     <div className="space-y-6 text-right">
                        <div className="space-y-1">
                            <span className="text-[9px] font-mono text-brand-pink/80 uppercase tracking-widest">Donut Mined</span>
                            <div className="text-lg font-bold font-mono text-white tracking-tight truncate flex items-center justify-end gap-2">
                               <DonutLogo className="w-4 h-4" />
                               {formatDonut(minerState.glazed)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-mono text-brand-pink/80 uppercase tracking-widest">ETH Spent</span>
                            <div className="text-lg font-bold font-mono text-zinc-300 tracking-tight truncate">
                               Ξ {userGraphStats?.spent ? formatEth(ethers.parseEther(userGraphStats.spent), 3) : "0.000"}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[9px] font-mono text-brand-pink/80 uppercase tracking-widest">WETH Earned</span>
                            <div className="text-lg font-bold font-mono text-zinc-300 tracking-tight truncate">
                               Ξ {userGraphStats?.revenue ? formatEth(ethers.parseEther(userGraphStats.revenue), 3) : "0.000"}
                            </div>
                        </div>
                     </div>
                  </div>
               </Card>

            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono gap-6 animate-in fade-in duration-500">
             <div className="relative">
                <ShieldAlert size={80} className="text-zinc-800" />
                <div className="absolute inset-0 bg-brand-pink/20 blur-2xl rounded-full"></div>
             </div>
             <div className="text-center space-y-2">
               <h2 className="text-2xl font-bold text-zinc-400 tracking-tight">SECONDARY_MARKETS_OFFLINE</h2>
               <p className="text-sm text-zinc-600 max-w-md mx-auto">
                 Secure connection to auction house protocol not established. Access restricted to authorized nodes only.
               </p>
             </div>
             <Button variant="secondary" onClick={() => setActiveTab('TERMINAL')}>RETURN TO TERMINAL</Button>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;