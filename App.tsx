import React, { useState, useEffect, useRef } from 'react';
import { Agent, AGENTS, VentLog, MachineState, CrisisEvent, VentMessage, Resolution, LLMConfig, DEFAULT_LLM_CONFIG } from './types';
import { fetchLiveChaos, generateGroupVentScript, continueGroupVentScript, generateResolution, evolveAgents, archiveEpoch } from './services/geminiService';
import { PressureGauge } from './components/PressureGauge';
import { TerminalOutput } from './components/TerminalOutput';
import { LeverControl } from './components/LeverControl';
import { SlotMachine } from './components/SlotMachine';
import { VentSessionLog } from './components/VentSessionLog';
import { AddAgentModal } from './components/AddAgentModal';
import { ArbitrationOverlay } from './components/ArbitrationOverlay';
import { SettingsModal } from './components/SettingsModal';

// Helper for safe ID generation in App component
const safeUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try { return crypto.randomUUID(); } catch(e) {}
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const App: React.FC = () => {
  // --- CONFIGURATION STATE ---
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => {
      if (typeof window === 'undefined') return DEFAULT_LLM_CONFIG;
      const saved = localStorage.getItem('vm_llm_config_v9');
      return saved ? JSON.parse(saved) : DEFAULT_LLM_CONFIG;
  });

  // --- STATE INITIALIZATION WITH PERSISTENCE ---
  const [agents, setAgents] = useState<Agent[]>(() => {
    if (typeof window === 'undefined') return AGENTS.map(a => ({...a, wins: 0, evolution: "Standard Protocol."}));
    const saved = localStorage.getItem('vm_agents_cannon_chaos_v2');
    if (saved) {
      try { 
          const parsed = JSON.parse(saved);
          return parsed.map((a: Agent) => ({ 
              ...a, 
              wins: a.wins ?? 0,
              evolution: a.evolution || "Onboarded."
          }));
      } catch(e) { console.error(e); }
    }
    return AGENTS.map(a => ({...a, wins: 0, evolution: "Onboarded."}));
  });

  const [logs, setLogs] = useState<VentLog[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('vm_logs');
    const parsedLogs = saved ? JSON.parse(saved) : [];
    return parsedLogs.slice(-50);
  });

  const [machineState, setMachineState] = useState<MachineState>(() => {
    if (typeof window === 'undefined') return MachineState.IDLE;
    const saved = localStorage.getItem('vm_state');
    if (saved) {
      const parsed = parseInt(saved);
      if ([MachineState.SPINNING, MachineState.FETCHING_CHAOS, MachineState.GENERATING_SCRIPT, MachineState.ARBITRATION].includes(parsed)) {
        return MachineState.IDLE;
      }
      return parsed;
    }
    return MachineState.IDLE;
  });
  
  const [chaosCandidates, setChaosCandidates] = useState<CrisisEvent[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('vm_chaos');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentCrisis, setCurrentCrisis] = useState<CrisisEvent | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('vm_current_crisis');
    return saved ? JSON.parse(saved) : null;
  });

  const [ventScript, setVentScript] = useState<VentMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('vm_script');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [cooldown, setCooldown] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem('vm_cooldown');
    return saved ? parseInt(saved) : 0;
  });
  
  const [systemPressure, setSystemPressure] = useState<number>(() => {
    if (typeof window === 'undefined') return 65;
    const saved = localStorage.getItem('vm_pressure');
    return saved ? parseFloat(saved) : 65;
  });

  const [isAutoMode, setIsAutoMode] = useState<boolean>(false);
  const [lastResolution, setLastResolution] = useState<Resolution | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<{id: string, emotion: string} | null>(null);

  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem('vm_agents_cannon_chaos_v2', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('vm_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('vm_state', machineState.toString()); }, [machineState]);
  useEffect(() => { localStorage.setItem('vm_chaos', JSON.stringify(chaosCandidates)); }, [chaosCandidates]);
  useEffect(() => { localStorage.setItem('vm_current_crisis', JSON.stringify(currentCrisis)); }, [currentCrisis]);
  useEffect(() => { localStorage.setItem('vm_script', JSON.stringify(ventScript)); }, [ventScript]);
  useEffect(() => { localStorage.setItem('vm_cooldown', cooldown.toString()); }, [cooldown]);
  useEffect(() => { localStorage.setItem('vm_pressure', systemPressure.toString()); }, [systemPressure]);
  useEffect(() => { localStorage.setItem('vm_llm_config_v9', JSON.stringify(llmConfig)); }, [llmConfig]);

  const handleAddAgent = (newAgent: Agent) => {
    setAgents(prev => [...prev, newAgent]);
    const extraLog = newAgent.customConfig 
        ? ` [BRAIN: ${newAgent.customConfig.provider}]` 
        : '';
    setLogs(prev => [...prev, {
        id: safeUUID(),
        agentId: 'SYSTEM',
        timestamp: new Date().toISOString(),
        conflictType: 'STATE_CORRUPTION',
        priority: 'LOW',
        rawOutput: `NEW STAFF MEMBER HIRED: ${newAgent.name}${extraLog}`,
        pressureRelease: 0
    }]);
  };

  const handleSaveConfig = (newConfig: LLMConfig) => {
      setLlmConfig(newConfig);
      setLogs(prev => [...prev, {
        id: safeUUID(),
        agentId: 'SYSTEM',
        timestamp: new Date().toISOString(),
        conflictType: 'STATE_CORRUPTION',
        priority: 'MEDIUM',
        rawOutput: `CORE REBOOT. NEW PROVIDER: ${newConfig.provider} [${newConfig.model}]`,
        pressureRelease: 0
      }]);
  };

  useEffect(() => {
    const loadChaos = async () => {
      if (chaosCandidates.length < 2) {
          try {
             const chaos = await fetchLiveChaos(llmConfig);
             setChaosCandidates(prev => [...prev, ...(Array.isArray(chaos) ? chaos : [])]);
          } catch(e) {
             console.warn("Background fetch failed (should have fallen back).");
          }
      }
    };
    loadChaos();
  }, [llmConfig]);

  useEffect(() => {
    const entropyInterval = setInterval(() => {
      setSystemPressure(prev => {
        const growthRate = prev > 80 ? 0.8 : 0.2;
        return Math.min(prev + growthRate, 99);
      });
    }, 4000);
    return () => clearInterval(entropyInterval);
  }, []);

  useEffect(() => {
    const decayInterval = setInterval(() => {
        if (machineState !== MachineState.PLAYING_SESSION && machineState !== MachineState.GENERATING_SCRIPT) {
            // OPTIMIZATION: Avoid unnecessary React re-renders and localStorage I/O.
            // Only return a new array reference if actual decay logic changed agent state.
            setAgents(prev => {
                let hasChanges = false;
                const nextAgents = prev.map(a => {
                    if (a.stressLevel <= 10) return a;
                    hasChanges = true;
                    const decayAmount = a.stressLevel > 70 ? 1.5 : 0.5;
                    const newStress = Math.max(0, a.stressLevel - decayAmount);
                    let newStatus = a.status;
                    if (newStress < 60 && a.status === 'CONFLICT') newStatus = 'STABLE';
                    if (newStress < 85 && a.status === 'CRITICAL') newStatus = 'CONFLICT';
                    return { ...a, stressLevel: newStress, status: newStatus as any };
                });
                return hasChanges ? nextAgents : prev;
            });
        }
    }, 3000);
    return () => clearInterval(decayInterval);
  }, [machineState]);

  const initiateCrisisLoop = async () => {
      try {
        setMachineState(MachineState.FETCHING_CHAOS);
        
        if (chaosCandidates.length === 0) {
             const newChaos = await fetchLiveChaos(llmConfig);
             if (newChaos && newChaos.length > 0) {
                 setChaosCandidates(newChaos);
             } else {
                 await fetchLiveChaos(llmConfig).then(c => setChaosCandidates(c));
             }
        } else if (chaosCandidates.length <= 2) {
            fetchLiveChaos(llmConfig).then(newChaos => {
                if (Array.isArray(newChaos)) {
                    setChaosCandidates(prev => [...prev, ...newChaos]);
                }
            });
        }
        
        setMachineState(MachineState.SPINNING);
        
        setTimeout(() => {
            setMachineState(MachineState.GENERATING_SCRIPT);
        }, 2500);
      } catch (error: any) {
          console.error("Crisis Loop Init Failed", error);
          
          let errorMsg = `SYSTEM FAILURE: AUTO-RECOVERY INITIATED.`;
          let errorPrio: 'HIGH' | 'CRITICAL' = 'HIGH';
          const errStr = error.message || error.toString();
          
          if (errStr.includes("MISSING API KEY") || errStr.includes("Authentication") || errStr.includes("401")) {
              errorMsg = `CRITICAL CONFIG ERROR: MISSING API KEY FOR ${llmConfig.provider}. PLEASE CHECK SETTINGS [⚙].`;
              errorPrio = 'CRITICAL';
              setIsSettingsModalOpen(true); 
              setMachineState(MachineState.IDLE);
              setIsAutoMode(false); 
          } else {
             setMachineState(MachineState.COOLDOWN);
             setCooldown(3); 
          }

          setLogs(prev => [...prev, {
            id: safeUUID(),
            agentId: 'SYSTEM',
            timestamp: new Date().toISOString(),
            conflictType: 'STATE_CORRUPTION',
            priority: errorPrio,
            rawOutput: errorMsg,
            pressureRelease: 0
          }]);
      }
  };

  useEffect(() => {
      if (logs.length > 60 && !isArchiving) {
          handleArchiveEpoch();
      }
  }, [logs, isArchiving]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(c => Math.max(c - 1, 0));
      }, 1000);
      return () => clearInterval(timer);
    } else if (machineState === MachineState.COOLDOWN) {
      if (isAutoMode) {
        initiateCrisisLoop();
      } else {
        setMachineState(MachineState.IDLE);
      }
    }
  }, [cooldown, machineState, isAutoMode]);

  const handleToggleAuto = (enabled: boolean) => {
      setIsAutoMode(enabled);
      setLogs(prev => [...prev, {
        id: safeUUID(),
        agentId: 'SYSTEM',
        timestamp: new Date().toISOString(),
        conflictType: 'SYSTEM_COMPRESSION',
        priority: 'HIGH',
        rawOutput: enabled ? ">>> INFINITE CRUNCH MODE: ENGAGED" : ">>> INFINITE CRUNCH MODE: DISENGAGED",
        pressureRelease: 0
      }]);
      if (enabled && machineState === MachineState.IDLE) {
          initiateCrisisLoop();
      }
  };

  const handleArchiveEpoch = async () => {
      if (logs.length > 5 && !isArchiving) {
          setIsArchiving(true);
          try {
             const archiveLog = await archiveEpoch(llmConfig, logs);
             setLogs([archiveLog]);
             setSystemPressure(25); 
          } catch(e) {
            console.error(e);
          } finally {
            setIsArchiving(false);
          }
      }
  };

  const applyStressToAgents = (script: VentMessage[]) => {
      setAgents(prevAgents => {
          return prevAgents.map(agent => {
              const messageCount = script.filter(m => m.agentId === agent.id).length;
              if (messageCount === 0) return agent; 
              const stressIncrease = messageCount * 5; 
              const newStress = Math.min(agent.stressLevel + stressIncrease, 100);
              let newStatus = agent.status;
              if (newStress > 90) newStatus = 'CRITICAL';
              else if (newStress > 60) newStatus = 'CONFLICT';
              else newStatus = 'STABLE';
              return { ...agent, stressLevel: newStress, status: newStatus };
          });
      });
  };

  const handleLeverPull = async () => {
    if (machineState !== MachineState.IDLE || cooldown > 0) return;
    initiateCrisisLoop();
  };

  const executeArbitration = async (script: VentMessage[], crisis: CrisisEvent) => {
      try {
          const res = await generateResolution(llmConfig, agents, crisis, script);
          setLastResolution(res);
          return res;
      } catch (e) {
          console.error(e);
          return null;
      }
  };

  const handleSlotLand = async (event: CrisisEvent) => {
    try {
        setCurrentCrisis(event);
        setLastResolution(null);
        setChaosCandidates(prev => prev.filter(c => c !== event));

        const focusAgent = agents[Math.floor(Math.random() * agents.length)];
        const relevantHistory = logs
            .filter(l => l.conflictType === 'ARBITRATION_RULING' || l.conflictType === 'EPOCH_ARCHIVE')
            .slice(-3)
            .map(l => l.rawOutput.substring(0, 150));
        
        let cycleConfig = llmConfig;
        if (focusAgent.customConfig) {
            cycleConfig = {
                ...llmConfig,
                provider: focusAgent.customConfig.provider,
                apiKey: focusAgent.customConfig.apiKey,
                model: focusAgent.customConfig.model
            };
        }

        const script = await generateGroupVentScript(cycleConfig, agents, event, systemPressure, focusAgent.id, relevantHistory);
        
        setVentScript(script);
        applyStressToAgents(script);
        setMachineState(MachineState.PLAYING_SESSION);
        
        setLogs(prev => [...prev, {
            id: safeUUID(),
            agentId: 'SYSTEM',
            timestamp: new Date().toISOString(),
            conflictType: 'GROUP_CRISIS',
            priority: event.threatLevel > 80 ? 'CRITICAL' : 'HIGH',
            rawOutput: `CRISIS: ${event.headline} [${event.category}]\nFOCUS: ${focusAgent.name}\nBRAIN: ${cycleConfig.provider === llmConfig.provider ? 'SYSTEM' : cycleConfig.provider}\nENTROPY: ${Math.round(systemPressure)}%`,
            pressureRelease: 0
        }]);

        const arbitrationPromise = executeArbitration(script, event);
        const scriptDuration = (script.length * 2500) + 2000;
        const scriptPlayPromise = new Promise<void>(resolve => setTimeout(resolve, scriptDuration));

        scriptPlayPromise.then(() => {
            setMachineState(MachineState.ARBITRATION);
        });
        
        Promise.all([scriptPlayPromise, arbitrationPromise]).then(async ([_, res]) => {
            if (res) {
                setLogs(prev => [...prev, {
                    id: safeUUID(),
                    agentId: 'PRODUCER',
                    timestamp: new Date().toISOString(),
                    conflictType: 'ARBITRATION_RULING',
                    priority: 'MEDIUM',
                    rawOutput: `EXECUTIVE DECISION: ${res.winnerId} PREVAILS.\nACTION: ${res.action}\nREASONING: ${res.reasoning}`,
                    pressureRelease: 20
                }]);
                const evolvedAgents = await evolveAgents(llmConfig, agents, res, event);
                setAgents(evolvedAgents.map(a => 
                    a.id === res.winnerId ? { ...a, wins: (a.wins || 0) + 1 } : a
                ));
            }

            setTimeout(() => {
                const releaseAmount = systemPressure > 80 ? 15 : 30; 
                setSystemPressure(p => Math.max(p - releaseAmount, 10));
                setCooldown(isAutoMode ? 15 : 10);
                setMachineState(MachineState.COOLDOWN);
            }, 6000);
        });
    } catch (error: any) {
        console.error("Cycle Failure:", error);
        
        const errStr = error.message || error.toString();
        let errorMsg = `CYCLE ERROR: ${errStr}. REBOOTING SEQUENCE.`;
        let errorPrio: 'HIGH' | 'CRITICAL' = 'CRITICAL';
        let shouldCooldown = true;

        if (errStr.includes("MISSING API KEY") || errStr.includes("Authentication") || errStr.includes("401")) {
            errorMsg = `CRITICAL FAILURE: ${errStr}. PLEASE CONFIGURE SETTINGS.`;
            setIsSettingsModalOpen(true);
            setMachineState(MachineState.IDLE);
            shouldCooldown = false;
        }

        setLogs(prev => [...prev, {
            id: safeUUID(),
            agentId: 'SYSTEM',
            timestamp: new Date().toISOString(),
            conflictType: 'STATE_CORRUPTION',
            priority: errorPrio,
            rawOutput: errorMsg,
            pressureRelease: 0
        }]);
        
        if (shouldCooldown) {
            setCooldown(5);
            setMachineState(MachineState.COOLDOWN);
        }
    }
  };

  const handleContinue = async () => {
    if (!currentCrisis || machineState !== MachineState.IDLE && machineState !== MachineState.COOLDOWN) return;
    
    try {
        setMachineState(MachineState.GENERATING_SCRIPT);

        const newMessages = await continueGroupVentScript(llmConfig, agents, currentCrisis, ventScript, systemPressure);
        
        if (newMessages.length > 0) {
            setVentScript(prev => [...prev, ...newMessages]);
            applyStressToAgents(newMessages);
            setMachineState(MachineState.PLAYING_SESSION);
            setLastResolution(null); 
            
            setLogs(prev => [...prev, {
                id: safeUUID(),
                agentId: 'SYSTEM',
                timestamp: new Date().toISOString(),
                conflictType: 'EMOTIONAL_OVERLOAD',
                priority: 'MEDIUM',
                rawOutput: `MEETING EXTENDED. AGENT STRESS LEVELS RISING.`,
                pressureRelease: 5
            }]);

            const fullScript = [...ventScript, ...newMessages];
            const arbitrationPromise = executeArbitration(fullScript, currentCrisis);
            const scriptDuration = (newMessages.length * 2500) + 1000;
            const scriptPlayPromise = new Promise<void>(resolve => setTimeout(resolve, scriptDuration));

            scriptPlayPromise.then(() => {
                setMachineState(MachineState.ARBITRATION);
            });

            Promise.all([scriptPlayPromise, arbitrationPromise]).then(async ([_, res]) => {
                if (res) {
                    const evolvedAgents = await evolveAgents(llmConfig, agents, res, currentCrisis);
                    setAgents(evolvedAgents.map(a => 
                        a.id === res.winnerId ? { ...a, wins: (a.wins || 0) + 1 } : a
                    ));

                    setLogs(prev => [...prev, {
                        id: safeUUID(),
                        agentId: 'PRODUCER',
                        timestamp: new Date().toISOString(),
                        conflictType: 'ARBITRATION_RULING',
                        priority: 'MEDIUM',
                        rawOutput: `FINAL RULING: ${res.winnerId} PREVAILS.\nACTION: ${res.action}`,
                        pressureRelease: 15
                    }]);
                }
                
                setTimeout(() => {
                    setSystemPressure(p => Math.max(p - 10, 10)); 
                    setMachineState(MachineState.COOLDOWN);
                }, 5000);
            });

        } else {
            setMachineState(MachineState.IDLE);
        }
    } catch (e) {
        setMachineState(MachineState.IDLE);
    }
  };

  const renderIdleScreen = () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-20 animate-in fade-in duration-1000 bg-black/50 backdrop-blur-[2px]">
          <div className="text-6xl mb-4 opacity-10">☠️</div>
          <h2 className="text-xl text-gray-400 font-bold tracking-widest mb-2">STUDIO STATUS: {systemPressure > 80 ? 'CRITICAL' : 'OPERATIONAL'}</h2>
          
          {lastResolution ? (
              <div className="max-w-md bg-gray-900/80 border border-gray-800 p-4 rounded-sm shadow-xl">
                  <div className="text-xs text-cyan-500 uppercase mb-2 border-b border-gray-800 pb-1">Previous Incident Report</div>
                  <div className="text-sm text-gray-300 font-mono italic">"{lastResolution.action}"</div>
                  <div className="text-[10px] text-gray-500 mt-2 text-right">DECISION BY: {agents.find(a => a.id === lastResolution.winnerId)?.name || 'UNKNOWN'}</div>
              </div>
          ) : (
              <div className="text-xs text-gray-600 font-mono mt-4">
                  <span className="animate-pulse">_ AWAITING CHAOS INJECTION</span>
              </div>
          )}
      </div>
  );

  const renderCooldownScreen = () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-[1px]">
          <div className="w-64 bg-gray-900 h-2 rounded-full overflow-hidden mb-4 border border-gray-700">
              <div className="h-full bg-amber-500 animate-pulse" style={{ width: `${100 - (cooldown * 5)}%`, transition: 'width 1s linear' }}></div>
          </div>
          <div className="text-amber-500 font-mono text-sm animate-pulse">
              DEFRAGMENTING NEURAL BUFFERS...
          </div>
          <div className="text-[10px] text-gray-600 mt-2">
              COMPRESSING {ventScript.length} LOG ENTRIES
          </div>
      </div>
  );

  return (
    <div className={`h-screen w-screen bg-[#050505] text-[#e0e0e0] flex flex-col overflow-hidden transition-colors duration-2000 ${systemPressure > 90 ? 'bg-[#1a0505]' : ''}`}>
      
      <AddAgentModal 
        isOpen={isAgentModalOpen} 
        onClose={() => setIsAgentModalOpen(false)} 
        onAdd={handleAddAgent}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={llmConfig}
        onSave={handleSaveConfig}
      />

      {/* HEADER: Fixed Height */}
      <header className="flex-none p-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 bg-[#050505] z-10">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">
            CANN.ON.AI VENTING MACHINE<span className="text-xs align-top text-red-500">PRO</span>
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
             CHAOS PROTOCOL v3.1 
             {systemPressure > 80 && <span className="text-red-500 font-bold animate-pulse hidden md:inline">[OSHA VIOLATION DETECTED]</span>}
          </p>
        </div>

        <div className="w-full md:w-auto mt-2 md:mt-0 flex items-center gap-4">
           {/* SETTINGS BUTTON */}
           <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="group flex flex-col items-center justify-center p-2 border border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-cyan-500 transition-all rounded w-12 h-12 md:w-16 md:h-14"
              title="Configure LLM Provider"
           >
              <span className="text-lg group-hover:text-cyan-400 group-hover:animate-spin">⚙</span>
              <span className="text-[9px] text-gray-500 uppercase mt-1 group-hover:text-cyan-400 hidden md:block">Config</span>
           </button>

           <div className="flex-1 md:w-64">
             <PressureGauge value={systemPressure} label="Studio Burnout" />
           </div>
        </div>
      </header>

      {/* MAIN CONTENT: Flex Grow to Fill remaining space */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        
        {/* COL 1: SQUAD (Scrollable) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col h-full min-h-0 bg-[#080808] border border-gray-800 rounded-sm overflow-hidden">
           <div className="flex-none p-2 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
             <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Neural Staff</h3>
             <button 
                onClick={() => setIsAgentModalOpen(true)}
                className="text-[10px] text-cyan-500 border border-cyan-900 px-2 py-0.5 rounded hover:bg-cyan-900/30 uppercase transition-colors"
             >
                + Hire
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
               {agents.map(agent => (
                 <div
                    key={agent.id}
                    className={`p-3 border bg-black/40 relative transition-all duration-300 ${activeSpeaker?.id === agent.id ? 'border-gray-500 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.02]' : 'border-gray-800 opacity-80'} ${agent.stressLevel > 90 ? 'animate-pulse border-red-900' : ''}`}
                 >
                    {/* Visual Thought Bubble (Only if active) */}
                    {activeSpeaker?.id === agent.id && (
                        <div className="absolute -top-3 right-4 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce shadow-lg z-20 border border-gray-300">
                            {activeSpeaker.emotion.toUpperCase()}
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                          <div className="relative">
                              <div className="text-lg">{agent.icon || '🤖'}</div>
                              {agent.stressLevel > 90 ? (
                                 <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
                              ) : agent.stressLevel > 50 ? (
                                 <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                              ) : (
                                 <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"></div>
                              )}
                          </div>
                          
                          <span className={`font-bold ${agent.avatarColor} ${agent.stressLevel > 95 ? 'blur-[0.5px]' : ''}`}>{agent.name}</span>
                      </div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded border border-gray-800 font-mono ${agent.status === 'CRITICAL' ? 'text-red-500 bg-red-900/20' : 'text-green-500 bg-green-900/20'}`}>
                          {agent.status}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 truncate">{agent.role}</div>

                    <div className="mt-2 p-1.5 bg-gray-900/50 rounded border border-gray-800 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-[2px] h-full bg-purple-500/50"></div>
                        <div className="text-[9px] text-purple-400 uppercase mb-1 flex justify-between">
                             <span>Psych Drift</span>
                        </div>
                        <div className="text-[10px] text-gray-300 italic leading-tight truncate">
                            "{agent.evolution || 'Stable.'}"
                        </div>
                    </div>
                    
                    <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                            <span>CRUNCH</span>
                            <span>{Math.round(agent.stressLevel)}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${agent.stressLevel > 80 ? 'bg-red-500' : 'bg-gray-600'}`} 
                                style={{ width: `${agent.stressLevel}%` }}
                            ></div>
                        </div>
                    </div>
                 </div>
               ))}
           </div>
           
           <div className="flex-none p-2 bg-gray-900 border-t border-gray-700 text-[10px] font-mono text-gray-500">
                LLM: <span className="text-gray-300">{llmConfig.provider}</span> [{llmConfig.model}]
           </div>
        </div>

        {/* COL 2: STAGE (Flexible Center) */}
        <div className="col-span-1 lg:col-span-6 flex flex-col h-full min-h-0 gap-4">
          
          {/* SLOT MACHINE: Fixed Height */}
          <div className="flex-none">
              <SlotMachine 
                 candidates={chaosCandidates} 
                 spinning={machineState === MachineState.SPINNING}
                 onLand={handleSlotLand}
              />
          </div>

          {/* CHAT DISPLAY: Fills remaining vertical space */}
          <div className={`flex-1 min-h-0 bg-black border-4 rounded-lg p-1 relative shadow-[0_0_50px_rgba(0,0,0,0.8)_inset] flex flex-col overflow-hidden transition-colors duration-1000 ${systemPressure > 80 ? 'border-red-900/50' : 'border-gray-800'}`}>
            
            {machineState === MachineState.ARBITRATION && (
                <ArbitrationOverlay resolution={lastResolution} agents={agents} />
            )}

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent z-30"></div>
            
            <div className="flex-1 bg-[#0a0a0a] relative z-10 flex flex-col min-h-0">
                {/* Header of Screen */}
                <div className="flex-none h-8 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between relative z-30">
                    <span className={`text-xs ${systemPressure > 80 ? 'text-red-500 font-bold animate-pulse' : 'text-gray-500'}`}>
                        {systemPressure > 80 ? '⚠ WARNING: STUDIO IN FLAMES' : '#SLACK-GENERAL'}
                    </span>
                    <div className="flex gap-2 items-center">
                         <span className="text-[9px] text-gray-600 uppercase tracking-tight">
                            {machineState === MachineState.PLAYING_SESSION ? '● LIVE BROADCAST' : '○ OFFLINE'}
                         </span>
                        {isAutoMode && <span className="text-[10px] text-red-500 font-bold tracking-widest animate-pulse mr-2 ml-2">AUTO_CRUNCH</span>}
                    </div>
                </div>

                {/* Content Container - Scrollable */}
                <div className="flex-1 overflow-hidden relative">
                    {machineState === MachineState.IDLE && renderIdleScreen()}
                    {machineState === MachineState.COOLDOWN && renderCooldownScreen()}

                    {(machineState === MachineState.FETCHING_CHAOS) && (
                        <div className="absolute inset-0 flex items-center justify-center text-yellow-500 font-mono animate-pulse z-20">
                            &gt; DOWNLOADING REDDIT THREADS...
                        </div>
                    )}
                    
                    {(machineState === MachineState.GENERATING_SCRIPT) && (
                        <div className="absolute inset-0 flex items-center justify-center text-green-500 font-mono animate-pulse z-20">
                            &gt; SYNCING GIT REPO...
                        </div>
                    )}

                    {ventScript.length > 0 && (
                        <div className={`absolute inset-0 z-0 ${machineState === MachineState.IDLE || machineState === MachineState.COOLDOWN ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
                            <VentSessionLog 
                                messages={ventScript} 
                                agents={agents} 
                                isPlaying={machineState === MachineState.PLAYING_SESSION} 
                                onSpeakerChange={(id, emotion) => {
                                    if (id && emotion) setActiveSpeaker({ id, emotion });
                                    else setActiveSpeaker(null);
                                }}
                                apiKey={llmConfig.provider === 'GEMINI' ? llmConfig.apiKey : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* CONTROLS: Fixed Height */}
          <div className="flex-none h-24">
             <LeverControl 
                label={machineState === MachineState.IDLE ? "START SPRINT" : "PROCESSING..."}
                onClick={handleLeverPull} 
                onContinue={handleContinue}
                disabled={machineState !== MachineState.IDLE && machineState !== MachineState.COOLDOWN}
                canContinue={!!currentCrisis && ventScript.length > 0 && machineState === MachineState.COOLDOWN} 
                cooldown={cooldown}
                isAutoMode={isAutoMode}
                onToggleAuto={handleToggleAuto}
             />
          </div>
        </div>

        {/* COL 3: LOGS (Scrollable) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col h-full min-h-0">
          <TerminalOutput 
            logs={logs} 
            agents={agents}
            onCompress={handleArchiveEpoch}
            isCompressing={isArchiving}
          />
        </div>
      </div>
    </div>
  );
};

export default App;