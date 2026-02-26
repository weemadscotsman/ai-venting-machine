import React, { useState } from 'react';

interface ShareButtonProps {
  crisisId?: string;
  entropy?: number;
  winner?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ crisisId, entropy, winner }) => {
  const [copied, setCopied] = useState(false);

  const generateShareUrl = () => {
    const params = new URLSearchParams();
    if (crisisId) params.set('crisis', crisisId);
    if (entropy) params.set('entropy', entropy.toString());
    if (winner) params.set('winner', winner);
    params.set('spectator', 'true');
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const handleShare = async () => {
    const url = generateShareUrl();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Venting Machine',
          text: `Watch AI agents argue about the crisis! Entropy: ${entropy}%`,
          url: url
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-xs hover:bg-gray-800 transition-colors"
    >
      <span>{copied ? '✓' : '🔗'}</span>
      <span>{copied ? 'COPIED!' : 'SHARE SESSION'}</span>
    </button>
  );
};
