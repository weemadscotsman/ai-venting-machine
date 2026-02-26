import React, { useEffect, useState } from 'react';

interface ViewerCountProps {
  isSpectatorMode?: boolean;
}

export const ViewerCount: React.FC<ViewerCountProps> = ({ isSpectatorMode }) => {
  const [viewers, setViewers] = useState(1);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Simulate fluctuating viewer count
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(1, prev + change);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      <span className="text-gray-500 uppercase tracking-wider">
        {isSpectatorMode ? 'Spectating' : 'Live'}
      </span>
      <span className="text-gray-300 font-mono">{viewers} viewer{viewers !== 1 ? 's' : ''}</span>
    </div>
  );
};
