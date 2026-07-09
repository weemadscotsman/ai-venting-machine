
import React from 'react';

interface LeverControlProps {
  onClick: () => void;
  onContinue: () => void;
  disabled: boolean;
  canContinue: boolean;
  label: string;
  cooldown?: number;
  isAutoMode: boolean;
  onToggleAuto: (val: boolean) => void;
}

export const LeverControl: React.FC<LeverControlProps> = ({ 
  onClick, 
  onContinue, 
  disabled, 
  canContinue, 
  label, 
  cooldown = 0,
  isAutoMode,
  onToggleAuto
}) => {
  return (
    <div className="flex gap-4 w-full h-full items-end">
      {/* ETERNAL MODE SWITCH */}
      <div className="flex flex-col gap-1 items-center justify-end h-full pb-1">
        <span className={`text-[9px] font-bold tracking-widest uppercase ${isAutoMode ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
          {isAutoMode ? 'LOOP ACTIVE' : 'SINGLE RUN'}
        </span>
        <button
          role="switch"
          aria-checked={isAutoMode}
          aria-label="Toggle Eternal Mode"
          onClick={() => onToggleAuto(!isAutoMode)}
          className={`
            w-16 h-8 rounded-full border-2 relative transition-all duration-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            ${isAutoMode ? 'bg-red-900/50 border-red-500' : 'bg-gray-900 border-gray-700'}
          `}
        >
          <div className={`
            absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center
            ${isAutoMode ? 'left-[calc(100%-1.6rem)] bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'left-0.5 bg-gray-500'}
          `}>
             {isAutoMode && <span className="text-[10px] text-black font-bold">∞</span>}
          </div>
        </button>
      </div>

      {/* MAIN ROLL LEVER */}
      <div className="relative group flex-1 h-24">
        {/* Caution stripes */}
        <div className="absolute -inset-1 bg-[repeating-linear-gradient(45deg,#000,#000_10px,#facc15_10px,#facc15_20px)] opacity-20 rounded-lg blur-sm group-hover:opacity-40 transition-opacity"></div>
        
        <button
          onClick={onClick}
          disabled={disabled || isAutoMode}
          className={`
            relative w-full h-full uppercase font-bold tracking-widest text-2xl
            border-4 transition-all duration-100 active:scale-95 flex items-center justify-center
            shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10 overflow-hidden
            focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            ${disabled || isAutoMode
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-red-700 border-red-900 text-white hover:bg-red-600 hover:border-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]'
            }
          `}
        >
          {/* Cooldown progress overlay */}
          {cooldown > 0 && (
            <div 
               className="absolute bottom-0 left-0 h-full bg-blue-900/50 transition-all duration-1000 ease-linear"
               style={{ width: `${(cooldown / 10) * 100}%` }}
            />
          )}

          <span className="relative z-10 flex flex-col items-center gap-1">
            {isAutoMode ? (
                <span className="text-red-200 animate-pulse">⚠️ ETERNAL MODE ENGAGED ⚠️</span>
            ) : (
                <>
                    {cooldown > 0 ? `COOLING DOWN... ${cooldown}s` : (disabled ? 'SYSTEM BUSY' : label)}
                    {!disabled && !cooldown && <span className="text-[10px] opacity-70 font-normal">Pull to Defragment</span>}
                </>
            )}
          </span>
          
          {/* Industrial overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30 pointer-events-none"></div>
        </button>
      </div>

      {/* CONTINUE BUTTON */}
      <div className="relative w-32 h-24">
         <button
            onClick={onContinue}
            disabled={!canContinue || disabled || isAutoMode}
            className={`
              w-full h-full uppercase font-bold text-sm tracking-wider
              border-4 transition-all duration-100 flex flex-col items-center justify-center gap-1
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
              ${!canContinue || disabled || isAutoMode
                ? 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-amber-700 border-amber-600 text-white hover:bg-amber-600 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              }
            `}
         >
            <span className="text-xl">↻</span>
            <span>EXTEND</span>
         </button>
      </div>
    </div>
  );
};
