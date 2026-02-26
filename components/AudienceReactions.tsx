import React, { useEffect, useState } from 'react';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface AudienceReactionsProps {
  isActive: boolean;
  machineState: string;
  currentSpeaker?: string;
}

const REACTIONS = ['🔥', '😂', '💀', '🍿', '🤯', '👀', '⚡', '🚨'];

export const AudienceReactions: React.FC<AudienceReactionsProps> = ({ 
  isActive, 
  machineState,
  currentSpeaker 
}) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      // Generate random reactions based on state
      const shouldReact = Math.random() > 0.7;
      
      if (shouldReact) {
        const newReaction: Reaction = {
          id: Math.random().toString(36).substr(2, 9),
          emoji: REACTIONS[Math.floor(Math.random() * REACTIONS.length)],
          x: Math.random() * 80 + 10, // 10-90%
          y: Math.random() * 60 + 20, // 20-80%
        };
        
        setReactions(prev => [...prev.slice(-5), newReaction]);
        
        // Remove after animation
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== newReaction.id));
        }, 2000);
      }
    }, machineState === 'PLAYING_SESSION' ? 800 : 2000);

    return () => clearInterval(interval);
  }, [isActive, machineState]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {reactions.map(reaction => (
        <div
          key={reaction.id}
          className="absolute text-2xl animate-bounce"
          style={{
            left: `${reaction.x}%`,
            top: `${reaction.y}%`,
            animation: 'float-up 2s ease-out forwards',
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      <style>{`
        @keyframes float-up {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
