import React, { useEffect, useRef, useState } from 'react';
import { VentLog, Agent } from '../types';

interface TerminalOutputProps {
  logs: VentLog[];
  agents: Agent[];
  onCompress: () => void;
  isCompressing: boolean;
}

const getPriorityColor = (priority: string) => {
  switch(priority) {
    case 'CRITICAL': return 'text-red-500 font-bold animate-pulse';
    case 'HIGH': return 'text-orange-500 font-bold';
    case 'MEDIUM': return 'text-yellow-500';
    default: return 'text-gray-500';
  }
};

const LogItem = React.memo(({ log }: { log: VentLog }) => (
  <div className={`border-l-2 pl-3 py-1 animate-in fade-in slide-in-from-bottom-2 duration-300 ${log.conflictType === 'EPOCH_ARCHIVE' ? 'border-amber-500 bg-amber-900/10' : log.isCompressed ? 'border-cyan-600 bg-cyan-900/10' : 'border-gray-700'}`}>
    <div className="flex gap-3 text-xs mb-1 opacity-70 flex-wrap">
      <span className="text-green-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
      <span className="text-blue-400 uppercase">AGNT: {log.agentId}</span>
      <span className={getPriorityColor(log.priority)}>PRIO: {log.priority}</span>
      {log.conflictType === 'EPOCH_ARCHIVE' && <span className="text-amber-400 font-bold">HISTORY_EVENT</span>}
    </div>

    {!log.isCompressed && (
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
         TYPE: {log.conflictType}
      </div>
    )}

    <div className="text-gray-300 whitespace-pre-wrap break-words">
      {log.rawOutput}
    </div>

    {!log.isCompressed && (
      <div className="text-xs text-gray-600 mt-1">
        &gt;&gt; PRESSURE RELEASED: -{log.pressureRelease} PSI
      </div>
    )}
  </div>
));

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ logs, agents, onCompress, isCompressing }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filterAgentId, setFilterAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, filterAgentId]);

  const filteredLogs = filterAgentId 
    ? logs.filter(log => log.agentId === filterAgentId || log.agentId === 'SYSTEM' || log.agentId === 'HISTORIAN') 
    : logs;

  return (
    <div className="h-full flex flex-col bg-black border border-gray-800 font-mono text-sm relative overflow-hidden rounded-sm">
      {/* Header / Filter Bar */}
      <div className="flex-none bg-gray-900/80 p-2 text-xs text-gray-400 border-b border-gray-800 flex flex-col gap-2">
        <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
                <label htmlFor="logFilter" className="cursor-pointer">/var/logs/</label>
                <select 
                    id="logFilter"
                    name="logFilter"
                    className="bg-black border border-gray-700 text-gray-300 px-1 py-0.5 outline-none hover:border-gray-500 cursor-pointer"
                    onChange={(e) => setFilterAgentId(e.target.value || null)}
                    value={filterAgentId || ""}
                >
                    <option value="">ALL_STREAMS</option>
                    {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name.toUpperCase()}</option>
                    ))}
                </select>
            </div>
            <div className="flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span>LIVE</span>
            </div>
        </div>

        {logs.length > 5 && !isCompressing && (
             <button 
                onClick={onCompress}
                className="self-start bg-amber-900/20 hover:bg-amber-900/40 text-amber-500 px-2 py-0.5 rounded border border-amber-800 text-[10px] transition-colors w-full text-center font-bold tracking-wider"
             >
               ⚠ ARCHIVE EPOCH & RESET
             </button>
        )}
        {isCompressing && <span className="text-amber-500 animate-pulse text-[10px]">WRITING HISTORY...</span>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono custom-scrollbar">
        {filteredLogs.length === 0 && (
            <div className="text-gray-600 italic text-center mt-10 opacity-50">
                {filterAgentId ? 'No logs for this agent.' : 'Waiting for system dump...'}
            </div>
        )}
        
        {filteredLogs.map((log) => (
          <LogItem key={log.id} log={log} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};