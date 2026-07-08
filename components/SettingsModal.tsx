import React, { useState, useEffect } from 'react';
import { LLMConfig, LLMProvider, DEFAULT_LLM_CONFIG } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSave: (config: LLMConfig) => void;
}

const PROVIDERS: { value: LLMProvider; label: string; placeholder: string; defaultModel: string }[] = [
    { value: 'MOONSHOT', label: 'Kimi Code', placeholder: 'sk-kimi-...', defaultModel: 'kimi-for-coding' },
    { value: 'OPENAI', label: 'OpenAI', placeholder: 'sk-...', defaultModel: 'gpt-4o-mini' },
    { value: 'GEMINI', label: 'Google Gemini', placeholder: 'System Key Used', defaultModel: 'gemini-3-flash-preview' },
    { value: 'ANTHROPIC', label: 'Anthropic Claude', placeholder: 'sk-ant...', defaultModel: 'claude-3-haiku-20240307' },
    { value: 'LOCAL', label: 'Local LLM (Ollama/LMStudio)', placeholder: 'No Key Needed', defaultModel: 'llama-3-8b' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
    const [localConfig, setLocalConfig] = useState<LLMConfig>(config);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLocalConfig(config);
    }, [config, isOpen]);

    if (!isOpen) return null;

    const handleProviderChange = (p: LLMProvider) => {
        const defaults = PROVIDERS.find(x => x.value === p);
        let defaultBaseUrl = '';
        
        if (p === 'LOCAL') defaultBaseUrl = 'http://localhost:1234/v1';
        if (p === 'MOONSHOT') defaultBaseUrl = 'https://api.kimi.com/coding/v1';

        setLocalConfig(prev => ({
            ...prev,
            provider: p,
            model: defaults?.defaultModel || '',
            baseUrl: defaultBaseUrl
        }));
        setIsDirty(true);
    };

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    const currentProviderDef = PROVIDERS.find(p => p.value === localConfig.provider);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-gray-700 p-6 rounded shadow-[0_0_50px_rgba(0,255,255,0.1)] relative">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-2">
                    <h2 className="text-xl font-bold text-cyan-500 tracking-widest">SYSTEM CORE CONFIG</h2>
                    <button aria-label="Close modal" onClick={onClose} className="text-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900">[ESC]</button>
                </div>

                <div className="space-y-6 font-mono text-sm">
                    {/* PROVIDER SELECTOR */}
                    <div>
                        <label className="block text-gray-500 mb-2 text-xs uppercase">Compute Provider</label>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            {PROVIDERS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => handleProviderChange(p.value)}
                                    className={`px-2 py-2 text-xs border rounded transition-all ${localConfig.provider === p.value ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API KEY */}
                    {localConfig.provider !== 'LOCAL' && (
                        <div>
                            <label htmlFor="configApiKey" className="block text-gray-500 mb-2 text-xs uppercase">API Key (Stored Locally)</label>
                            <input
                                id="configApiKey"
                                name="configApiKey"
                                type="password"
                                value={localConfig.apiKey}
                                onChange={e => { setLocalConfig(c => ({ ...c, apiKey: e.target.value })); setIsDirty(true); }}
                                className="w-full bg-black border border-gray-800 p-2 text-white focus:border-cyan-500 outline-none"
                                placeholder={currentProviderDef?.placeholder}
                            />
                            {localConfig.provider === 'GEMINI' && (
                                <p className="text-[10px] text-green-500 mt-1">
                                    Leave empty to use system default environment key.
                                </p>
                            )}
                            {localConfig.provider === 'MOONSHOT' && (
                                <p className="text-[10px] text-green-500 mt-1">
                                    Leave empty to use process.env.API_KEY if injected.
                                </p>
                            )}
                        </div>
                    )}

                    {/* MODEL NAME */}
                    <div>
                        <label htmlFor="configModel" className="block text-gray-500 mb-2 text-xs uppercase">Model ID</label>
                        <input
                            id="configModel"
                            name="configModel"
                            type="text"
                            value={localConfig.model}
                            onChange={e => { setLocalConfig(c => ({ ...c, model: e.target.value })); setIsDirty(true); }}
                            className="w-full bg-black border border-gray-800 p-2 text-white focus:border-cyan-500 outline-none"
                        />
                        <p className="text-[10px] text-gray-600 mt-1">Recommended: kimi-for-coding, gemini-3-flash-preview. Small models preferred.</p>
                    </div>

                    {/* BASE URL */}
                    {(localConfig.provider === 'LOCAL' || localConfig.provider === 'OPENAI' || localConfig.provider === 'MOONSHOT') && (
                        <div>
                            <label htmlFor="configBaseUrl" className="block text-gray-500 mb-2 text-xs uppercase">Base URL (API Endpoint)</label>
                            <input
                                id="configBaseUrl"
                                name="configBaseUrl"
                                type="text"
                                value={localConfig.baseUrl}
                                onChange={e => { setLocalConfig(c => ({ ...c, baseUrl: e.target.value })); setIsDirty(true); }}
                                className="w-full bg-black border border-gray-800 p-2 text-cyan-300 focus:border-cyan-500 outline-none"
                                placeholder="https://api.kimi.com/coding/v1"
                            />
                        </div>
                    )}
                    
                    <div className="bg-gray-900/50 p-3 border border-gray-800 rounded text-[10px] text-gray-400">
                        <strong>TOKEN SAVER ACTIVE:</strong> Protocol V2 uses pipe-delimited compression to reduce token usage by ~90%. This allows extended runtime on lower tier models.
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-cyan-900/20 border border-cyan-600 text-cyan-400 py-3 font-bold hover:bg-cyan-900/40 transition-all uppercase tracking-widest"
                    >
                        {isDirty ? 'REBOOT CORE WITH NEW SETTINGS' : 'CONFIRM CONFIG'}
                    </button>
                </div>
            </div>
        </div>
    );
};