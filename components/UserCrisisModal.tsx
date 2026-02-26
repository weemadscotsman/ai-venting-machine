import React, { useState } from 'react';
import { CrisisEvent } from '../types';
import { createUserCrisis } from '../services/llmService';

interface UserCrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (crisis: CrisisEvent) => void;
}

export const UserCrisisModal: React.FC<UserCrisisModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [headline, setHeadline] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('TECH');
  const [threatLevel, setThreatLevel] = useState(50);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const crisis = createUserCrisis(headline, context, category, threatLevel);
    onSubmit(crisis);
    setHeadline('');
    setContext('');
    setThreatLevel(50);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-white mb-4">Inject Custom Crisis</h2>
        <p className="text-sm text-gray-400 mb-4">
          Create your own crisis for the team to deliberate on.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g., Server Farm Catches Fire"
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-500 uppercase mb-1">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What exactly happened?"
              rows={3}
              className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none resize-none"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none"
              >
                <option value="TECH">TECH</option>
                <option value="MEME">MEME</option>
                <option value="FINANCE">FINANCE</option>
                <option value="EXISTENTIAL">EXISTENTIAL</option>
                <option value="POLITICS">POLITICS</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1">Threat: {threatLevel}%</label>
              <input
                type="range"
                min="1"
                max="100"
                value={threatLevel}
                onChange={(e) => setThreatLevel(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-700 rounded text-gray-400 hover:bg-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-sm font-bold"
            >
              Inject Crisis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
