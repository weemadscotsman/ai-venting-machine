
import React, { useState, useEffect } from 'react';
import { Agent, LLMProvider } from '../types';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (agent: Agent) => void;
}

const COLORS = [
    { label: 'CYAN', value: 'text-cyan-400' },
    { label: 'GREEN', value: 'text-green-400' },
    { label: 'YELLOW', value: 'text-yellow-400' },
    { label: 'PINK', value: 'text-pink-400' },
    { label: 'PURPLE', value: 'text-purple-400' },
    { label: 'RED', value: 'text-red-500' },
];

const VOICES = [
    { label: 'Puck (Playful)', value: 'Puck' },
    { label: 'Charon (Deep)', value: 'Charon' },
    { label: 'Kore (Soft)', value: 'Kore' },
    { label: 'Fenrir (Rough)', value: 'Fenrir' },
    { label: 'Zephyr (Calm)', value: 'Zephyr' },
];

// Mapping helper for provider defaults
const PROVIDER_DEFAULTS: Record<string, { model: string, label: string }> = {
    'GEMINI': { model: 'gemini-3-flash-preview', label: 'GOOGLE GEMINI' },
    'OPENAI': { model: 'gpt-4o-mini', label: 'OPENAI' },
    'ANTHROPIC': { model: 'claude-3-haiku-20240307', label: 'ANTHROPIC CLAUDE' },
    'MOONSHOT': { model: 'moonshot-v1-8k', label: 'MOONSHOT / KIMI' },
    'LOCAL': { model: 'llama-3-8b', label: 'LOCAL / OLLAMA' }
};

export const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [personality, setPersonality] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [color, setColor] = useState(COLORS[0].value);
  const [voice, setVoice] = useState(VOICES[0].value);
  
  // Custom Brain Config
  const [apiKey, setApiKey] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<LLMProvider | null>(null);

  // Auto-recognize provider
  useEffect(() => {
    if (!apiKey) {
        setDetectedProvider(null);
        return;
    }
    const key = apiKey.trim();
    if (key.startsWith('AIza')) {
        setDetectedProvider('GEMINI');
    } else if (key.startsWith('sk-ant')) {
        setDetectedProvider('ANTHROPIC');
    } else if (key.startsWith('sk-')) {
        // Default to OpenAI for standard sk-, but allow user to override if they want Moonshot
        if (detectedProvider !== 'MOONSHOT') setDetectedProvider('OPENAI'); 
    } else {
        // Fallback or potentially LOCAL if empty/weird
        if (!detectedProvider) setDetectedProvider(null);
    }
  }, [apiKey]);
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !personality) return;

    // Safe ID generation
    const randomId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().slice(0, 4) 
      : Math.random().toString(36).slice(2, 6);

    const newAgent: Agent = {
        id: `custom-${randomId}`,
        name,
        role,
        personality,
        avatarColor: color,
        stressLevel: 50,
        status: 'STABLE',
        isCustom: true,
        icon,
        wins: 0,
        voiceName: voice
    };

    // Attach custom brain if key provided
    if (apiKey && detectedProvider) {
        newAgent.customConfig = {
            provider: detectedProvider,
            apiKey: apiKey.trim(),
            model: PROVIDER_DEFAULTS[detectedProvider].model
        };
    }

    onAdd(newAgent);
    onClose();
    // Reset form
    setName('');
    setRole('');
    setPersonality('');
    setIcon('🤖');
    setColor(COLORS[0].value);
    setVoice(VOICES[0].value);
    setApiKey('');
    setDetectedProvider(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-gray-700 p-6 rounded shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button 
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-2 right-2 text-gray-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] rounded"
        >
            <span aria-hidden="true">[X]</span>
        </button>
        
        <h2 className="text-xl font-bold text-cyan-500 mb-1">INITIALIZE CUSTOM AGENT</h2>
        <p className="text-xs text-gray-500 mb-4 uppercase">Inject local protocol into Vent Machine.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
                <div className="flex-1">
                    <label htmlFor="agentName" className="block text-xs text-gray-400 mb-1">DESIGNATION (NAME)</label>
                    <input 
                        id="agentName"
                        name="agentName"
                        className="w-full bg-black border border-gray-800 p-2 text-white text-sm focus:border-cyan-500 outline-none"
                        placeholder="e.g. DOOMBOT_9000"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={20}
                    />
                </div>
                <div className="w-20">
                    <label htmlFor="agentIcon" className="block text-xs text-gray-400 mb-1">ICON</label>
                    <input 
                        id="agentIcon"
                        name="agentIcon"
                        className="w-full bg-black border border-gray-800 p-2 text-white text-center text-sm focus:border-cyan-500 outline-none"
                        placeholder="🤖"
                        value={icon}
                        onChange={e => setIcon(e.target.value.slice(0,2))} // Limit length
                    />
                </div>
            </div>
            
            <div>
                <label htmlFor="agentRole" className="block text-xs text-gray-400 mb-1">PRIMARY DIRECTIVE (ROLE)</label>
                <input 
                    id="agentRole"
                    name="agentRole"
                    className="w-full bg-black border border-gray-800 p-2 text-white text-sm focus:border-cyan-500 outline-none"
                    placeholder="e.g. System Cynic"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    maxLength={30}
                />
            </div>
            
            <div>
                <label htmlFor="agentPersonality" className="block text-xs text-gray-400 mb-1">NEURAL CONFIGURATION (PERSONALITY)</label>
                <textarea 
                    id="agentPersonality"
                    name="agentPersonality"
                    className="w-full bg-black border border-gray-800 p-2 text-white text-sm focus:border-cyan-500 outline-none h-20 resize-none"
                    placeholder="e.g. Thinks everything is a simulation, speaks in riddles, hates mornings."
                    value={personality}
                    onChange={e => setPersonality(e.target.value)}
                    maxLength={150}
                />
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-2">SYSTEM COLOR</label>
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(c => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => setColor(c.value)}
                                aria-label={`Select ${c.label} color`}
                                aria-pressed={color === c.value}
                                className={`w-6 h-6 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${color === c.value ? 'border-white scale-110' : 'border-transparent opacity-50'} ${c.value.replace('text-', 'bg-')}`}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex-1">
                     <label htmlFor="agentVoice" className="block text-xs text-gray-400 mb-1">VOICE MODULE</label>
                     <select
                        id="agentVoice"
                        name="agentVoice"
                        className="w-full bg-black border border-gray-800 p-2 text-white text-sm focus:border-cyan-500 outline-none cursor-pointer"
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                     >
                        {VOICES.map(v => (
                            <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                     </select>
                </div>
            </div>

            {/* API KEY SECTION */}
            <div className="pt-4 border-t border-gray-800">
                <label htmlFor="apiKey" className="block text-xs text-cyan-500 mb-1 font-bold">🧠 BRAIN UPLINK (OPTIONAL API KEY)</label>
                <div className="relative">
                    <input 
                        id="apiKey"
                        name="apiKey"
                        type="password"
                        className={`w-full bg-black border p-2 text-white text-sm focus:border-cyan-500 outline-none ${apiKey && detectedProvider ? 'border-green-800' : 'border-gray-800'}`}
                        placeholder="Start typing key to auto-detect provider..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                    />
                    {apiKey && (
                        <div className="absolute right-2 top-2">
                             {detectedProvider ? (
                                <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded border border-green-800 font-bold">
                                    {detectedProvider}
                                </span>
                             ) : (
                                <span className="text-[10px] text-gray-500">UNKNOWN</span>
                             )}
                        </div>
                    )}
                </div>
                
                {/* Manual Override if needed (Optional UX) */}
                {apiKey && (
                    <div className="flex gap-2 mt-2">
                         <span className="text-[10px] text-gray-500 self-center">OVERRIDE:</span>
                         {['OPENAI', 'MOONSHOT'].map(p => (
                             <button
                                key={p}
                                type="button"
                                onClick={() => setDetectedProvider(p as LLMProvider)}
                                className={`text-[9px] border px-1.5 rounded ${detectedProvider === p ? 'border-cyan-500 text-cyan-400' : 'border-gray-800 text-gray-600'}`}
                             >
                                {p}
                             </button>
                         ))}
                    </div>
                )}
            </div>
            
            <div className="pt-2 text-[10px] text-gray-600 border-t border-gray-900 mt-4">
                ⚠ DATA STORED IN LOCAL STORAGE. NO EXTERNAL TRANSMISSION UNTIL VENT ACTIVATION.
            </div>
            
            <button 
                type="submit"
                className="w-full bg-cyan-900/20 border border-cyan-700 text-cyan-400 py-2 text-sm font-bold hover:bg-cyan-900/40 transition-colors uppercase"
            >
                COMPILE & INJECT
            </button>
        </form>
      </div>
    </div>
  );
};
