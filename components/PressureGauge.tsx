import React from 'react';

interface PressureGaugeProps {
  value: number; // 0-100
  label: string;
}

export const PressureGauge: React.FC<PressureGaugeProps> = ({ value, label }) => {
  // Color calculation with gradients for escalation
  const getColor = (val: number) => {
    if (val < 50) return 'bg-gradient-to-r from-green-600 to-green-400';
    if (val < 80) return 'bg-gradient-to-r from-amber-600 to-amber-400';
    if (val < 95) return 'bg-gradient-to-r from-red-600 to-red-500';
    return 'bg-gradient-to-r from-red-900 to-red-600'; // Meltdown
  };

  const getTextColor = (val: number) => {
    if (val < 50) return 'text-green-500';
    if (val < 80) return 'text-amber-500';
    if (val < 95) return 'text-red-500';
    return 'text-red-600';
  };

  const isCritical = value > 80;
  const isExtreme = value > 95;

  return (
    <div className={`flex flex-col gap-1 w-full p-4 border border-gray-800 bg-black/40 rounded-sm transition-colors duration-300 ${isCritical ? 'border-red-900/50 bg-red-900/10' : ''} ${isExtreme ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-end mb-2">
        <span className={`text-xs uppercase tracking-widest font-bold ${getTextColor(value)} ${isCritical ? 'animate-pulse' : ''}`}>
          {isExtreme ? '⚠ SYSTEM MELTDOWN' : label}
        </span>
        <span className={`text-xl font-mono text-white ${isExtreme ? 'animate-shake' : ''}`}>
          {Math.round(value)}<span className="text-xs text-gray-500">%</span>
        </span>
      </div>
      
      <div className={`h-4 bg-gray-900 w-full relative overflow-hidden border border-gray-700 ${isExtreme ? 'border-red-500' : ''}`}>
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none z-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-black/50" />
          ))}
        </div>
        
        {/* Bar */}
        <div 
          className={`h-full transition-all duration-700 ease-out ${getColor(value)} ${isCritical ? 'animate-pulse' : ''}`}
          style={{ width: `${value}%` }}
        />
        
        {/* Glitch Overlay for High Stress */}
        {isCritical && (
            <div className="absolute inset-0 bg-white/10 w-full h-full animate-ping opacity-20"></div>
        )}
      </div>
      
      <div className="flex justify-between text-[10px] text-gray-600 font-mono mt-1">
        <span>SAFE</span>
        <span>LOAD</span>
        <span className={isCritical ? 'text-red-500 font-bold animate-pulse' : ''}>CRITICAL</span>
      </div>
    </div>
  );
};