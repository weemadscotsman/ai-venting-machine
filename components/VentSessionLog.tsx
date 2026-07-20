import React, { useEffect, useState, useRef } from 'react';
import { VentMessage, Agent } from '../types';
import { generateAgentAudio } from '../services/geminiService';

interface VentSessionLogProps {
  messages: VentMessage[];
  agents: Agent[];
  isPlaying: boolean;
  onSpeakerChange?: (agentId: string | null, emotion: string | null) => void;
  apiKey?: string;
}

// Helper to decode Base64 to ArrayBuffer
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Memoized message item to prevent re-rendering all messages on new appends
const MessageItem = React.memo(({ msg, agent, idx, isPlaying, isLoading, onPlayAudio }: {
  msg: VentMessage,
  agent?: Agent,
  idx: number,
  isPlaying: boolean,
  isLoading: boolean,
  onPlayAudio: (msg: VentMessage, voiceName?: string) => void
}) => {
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
              disabled={isLoading}
              className={`ml-2 p-1 rounded-full border border-gray-700 hover:bg-gray-800 transition-colors ${isPlaying ? 'text-green-400 border-green-900 animate-pulse' : 'text-gray-500'}`}
              title="Play Voice"
              type="button"
              aria-label={`Play audio for ${agent?.name}`}
           >
              {isLoading ? (
                  <span className="block w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
              ) : isPlaying ? (
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

export const VentSessionLog: React.FC<VentSessionLogProps> = ({ messages, agents, isPlaying, onSpeakerChange, apiKey }) => {
  const [visibleMessages, setVisibleMessages] = useState<VentMessage[]>([]);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Latest-ref pattern for stable callbacks
  const apiKeyRef = useRef(apiKey);
  const playingAudioIdRef = useRef(playingAudioId);

  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { playingAudioIdRef.current = playingAudioId; }, [playingAudioId]);

  // Initialize Audio Context on user interaction (handled in play function) or lazy load
  const getAudioContext = React.useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const handlePlayAudio = React.useCallback(async (msg: VentMessage, voiceName?: string) => {
    // Stop current audio if playing
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current = null;
        setPlayingAudioId(null);
        if (playingAudioIdRef.current === msg.id) return; // Toggle off
    }

    // Only attempt if we have a key (or if we want to rely on service internal env fallback, but service requires arg)
    const keyToUse = apiKeyRef.current || process.env.API_KEY || '';
    if (!keyToUse) {
        console.warn("No API Key available for TTS");
        return;
    }

    setLoadingAudioId(msg.id);

    try {
        const base64 = await generateAgentAudio(msg.text, voiceName || 'Zephyr', keyToUse);
        if (!base64) throw new Error("No audio returned");

        const ctx = getAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();

        const pcmData = decodeBase64(base64);
        const audioBuffer = await decodeAudioData(pcmData, ctx, 24000, 1);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
            setPlayingAudioId(null);
            sourceNodeRef.current = null;
        };

        sourceNodeRef.current = source;
        source.start();
        setPlayingAudioId(msg.id);

    } catch (e) {
        console.error("Playback failed", e);
    } finally {
        setLoadingAudioId(null);
    }
  }, []);

  // Playback Logic for Chat
  useEffect(() => {
    if (messages.length === 0) {
        setVisibleMessages([]);
        if (onSpeakerChange) onSpeakerChange(null, null);
        return;
    }

    // If not actively playing a live session (e.g. historical view), show all immediately
    if (!isPlaying) {
        setVisibleMessages(messages);
        return;
    }

    // Detect new session start (first message changed)
    if (visibleMessages.length > 0 && messages[0]?.id !== visibleMessages[0]?.id && isPlaying) {
        setVisibleMessages([]);
    }

    let currentIndex = 0;
    
    // Only run typing effect if we are playing
    const interval = setInterval(() => {
      // Find where we are in the message queue relative to visible messages
      const nextIndex = visibleMessages.length;
      
      if (nextIndex < messages.length) {
        const msg = messages[nextIndex];
        
        setVisibleMessages(prev => {
            // Safety check against race conditions
            if (prev.length >= messages.length) return prev;
            // Also check if we are adding the right message ID to avoid mixing scripts
            if (prev.length > 0 && prev[0].agentId !== messages[0].agentId && prev[0].timestamp !== messages[0].timestamp) {
               // This implies a script swap happened mid-update, safe to reset or replace
               return [msg];
            }
            return [...prev, msg];
        });
        
        // Notify parent of who is talking
        if (onSpeakerChange) {
            onSpeakerChange(msg.agentId, msg.emotion);
        }
      } else {
        if (onSpeakerChange) onSpeakerChange(null, null); // Session end
        clearInterval(interval);
      }
    }, 2500); // 2.5 seconds per message

    return () => clearInterval(interval);
  }, [messages, isPlaying]); // Removed visibleMessages from dependency to avoid infinite loops, logic inside interval handles it.

  // Cleanup speaker on unmount or stop
  useEffect(() => {
    if (!isPlaying && onSpeakerChange) {
        onSpeakerChange(null, null);
    }
    return () => {
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch(e) {}
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, [isPlaying]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  const getAgent = (id: string) => agents.find(a => a.id === id);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 font-mono scroll-smooth pb-20">
      {visibleMessages.length === 0 && (
          <div className="h-full flex items-center justify-center opacity-30 text-center flex-col gap-2">
              <p>WAITING FOR CRISIS SYNC...</p>
          </div>
      )}
      
      {visibleMessages.map((msg, idx) => (
        <MessageItem
          key={msg.id}
          msg={msg}
          agent={getAgent(msg.agentId)}
          idx={idx}
          isPlaying={playingAudioId === msg.id}
          isLoading={loadingAudioId === msg.id}
          onPlayAudio={handlePlayAudio}
        />
      ))}
      
      {/* Typing Indicator */}
      {isPlaying && visibleMessages.length < messages.length && messages.length > 0 && (
         <div className="flex items-center gap-2 text-xs text-gray-600 animate-pulse pl-4 mt-4">
             <span className="w-1 h-4 bg-green-500 inline-block"></span>
             <span>NEURAL NET COMPUTING RESPONSE...</span>
         </div>
      )}
    </div>
  );
};