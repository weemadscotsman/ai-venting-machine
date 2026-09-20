import React from 'react';
import { VentMessage, Agent } from '../types';

interface VentMessageItemProps {
  msg: VentMessage;
  idx: number;
  agent: Agent | undefined;
  isPlayingAudio: boolean;
  isLoadingAudio: boolean;
  onPlayAudio: (msg: VentMessage, voiceName?: string) => void;
}

export const VentMessageItem: React.FC<VentMessageItemProps> = React.memo(({ msg, idx, agent, isPlayingAudio, isLoadingAudio, onPlayAudio }) => {
  const isRight = idx % 2 === 1;

  return (
    <div
      className={`flex ${isRight ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-500 fade-in group`}
    >
      <div className={`max-w-[85%] md:max-w-[75%] border border-gray-800 p-3 rounded-sm relative ${isRight ? 'bg-gray-900/50' : 'bg-black/80'}`}>
         <div className="flex items-center gap-2 mb-2 border-b border-gray-800 pb-1">
           <div className={`w-2 h-2 rounded-full ${agent?.status === 'CRITICAL' ? 'bg-red-500' : 'bg-green-500'}`}></div>
           <span className={`font-bold text-xs uppercase tracking-wider ${agent?.avatarColor}`}>{agent?.name}</span>
           {agent?.icon && <span className="text-sm">{agent.icon}</span>}
           <span className="text-[10px] text-gray-500 ml-auto uppercase opacity-70">[{msg.emotion}]</span>

           {/* Play Button */}
           <button
              onClick={() => onPlayAudio(msg, agent?.voiceName)}
              disabled={isLoadingAudio}
              className={`ml-2 p-1 rounded-full border border-gray-700 hover:bg-gray-800 transition-colors ${isPlayingAudio ? 'text-green-400 border-green-900 animate-pulse' : 'text-gray-500'}`}
              title="Play Voice"
              type="button"
              aria-label={`Play audio for ${agent?.name}`}
           >
              {isLoadingAudio ? (
                  <span className="block w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
              ) : isPlayingAudio ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
           </button>
         </div>
         <div className="text-sm md:text-base text-gray-300 leading-relaxed font-mono">
           {msg.text}
         </div>
      </div>
    </div>
  );
});
