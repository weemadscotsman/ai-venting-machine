
import React, { useEffect, useRef, useMemo } from 'react';
import { Agent } from '../types';
import { getRelationship, getAgentMemory } from '../services/llmService';

interface SocialMemoryGraphProps {
  agents: Agent[];
  activeSpeaker: { id: string; emotion: string } | null;
}

interface Node {
  id: string;
  x: number;
  y: number;
  agent: Agent;
  radius: number;
}

interface Edge {
  source: string;
  target: string;
  strength: number;
  type: 'alliance' | 'hostile' | 'neutral' | 'grudge';
}

export const SocialMemoryGraph: React.FC<SocialMemoryGraphProps> = ({ agents, activeSpeaker }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);

  // Build relationship edges
  const edges = useMemo(() => {
    const edgeList: Edge[] = [];
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];
        
        // Check both directions for relationship
        const relAtoB = getRelationship(a.id, b.id);
        const relBtoA = getRelationship(b.id, a.id);
        const strength = (relAtoB + relBtoA) / 2;
        
        // Check for grudges
        const memA = getAgentMemory(a.id);
        const memB = getAgentMemory(b.id);
        const hasGrudge = memA.betrayals.includes(b.id) || memB.betrayals.includes(a.id);
        
        let type: Edge['type'] = 'neutral';
        if (hasGrudge) type = 'grudge';
        else if (strength > 30) type = 'alliance';
        else if (strength < -30) type = 'hostile';
        
        edgeList.push({
          source: a.id,
          target: b.id,
          strength: Math.abs(strength),
          type
        });
      }
    }
    
    return edgeList;
  }, [agents]);

  // Initialize node positions in a circle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    nodesRef.current = agents.map((agent, i) => {
      const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: agent.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        agent,
        radius: agent.stressLevel > 80 ? 18 : agent.stressLevel > 50 ? 14 : 10
      };
    });
  }, [agents]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw edges
      edges.forEach(edge => {
        const sourceNode = nodesRef.current.find(n => n.id === edge.source);
        const targetNode = nodesRef.current.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;
        
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        
        // Edge styling based on relationship type
        switch (edge.type) {
          case 'alliance':
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.3 + edge.strength / 200})`;
            ctx.lineWidth = 2 + edge.strength / 20;
            break;
          case 'hostile':
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + edge.strength / 200})`;
            ctx.lineWidth = 2 + edge.strength / 20;
            ctx.setLineDash([5, 5]);
            break;
          case 'grudge':
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)';
            ctx.lineWidth = 3;
            ctx.setLineDash([2, 2]);
            break;
          default:
            ctx.strokeStyle = 'rgba(75, 85, 99, 0.2)';
            ctx.lineWidth = 1;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw relationship score at midpoint
        if (edge.type !== 'neutral') {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.fillStyle = edge.type === 'alliance' ? '#22c55e' : '#ef4444';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(Math.round(edge.strength).toString(), midX, midY);
        }
      });
      
      // Draw nodes
      nodesRef.current.forEach(node => {
        const isActive = activeSpeaker?.id === node.id;
        const isCritical = node.agent.status === 'CRITICAL';
        
        // Node glow for active speaker
        if (isActive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
          ctx.fill();
        }
        
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        // Fill based on status
        if (isCritical) {
          ctx.fillStyle = '#7f1d1d';
        } else if (node.agent.status === 'CONFLICT') {
          ctx.fillStyle = '#713f12';
        } else {
          ctx.fillStyle = '#1f2937';
        }
        ctx.fill();
        
        // Border
        ctx.strokeStyle = isActive ? '#a855f7' : 
                         isCritical ? '#ef4444' : 
                         node.agent.status === 'CONFLICT' ? '#eab308' : 
                         '#4b5563';
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.stroke();
        
        // Agent icon
        ctx.fillStyle = '#fff';
        ctx.font = `${node.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.agent.icon || '👤', node.x, node.y);
        
        // Label
        ctx.fillStyle = isActive ? '#a855f7' : '#9ca3af';
        ctx.font = isActive ? 'bold 10px monospace' : '9px monospace';
        ctx.fillText(node.agent.name.split(' ')[0], node.x, node.y + node.radius + 12);
        
        // Stress indicator ring
        if (node.agent.stressLevel > 0) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4, 0, (node.agent.stressLevel / 100) * Math.PI * 2);
          ctx.strokeStyle = node.agent.stressLevel > 80 ? '#ef4444' : 
                           node.agent.stressLevel > 50 ? '#eab308' : '#22c55e';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [edges, activeSpeaker]);

  // Get alliance and grudge summaries
  const allianceCount = edges.filter(e => e.type === 'alliance').length;
  const grudgeCount = edges.filter(e => e.type === 'grudge').length;
  const hostileCount = edges.filter(e => e.type === 'hostile').length;

  return (
    <div className="h-full flex flex-col bg-black border-l border-gray-800">
      <div className="h-7 border-b border-gray-800 flex items-center justify-between px-3 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase font-bold">Social Memory Graph</span>
        <div className="flex gap-2 text-[8px]">
          <span className="text-green-500">● {allianceCount} alliances</span>
          <span className="text-red-500">● {grudgeCount} grudges</span>
          <span className="text-yellow-500">● {hostileCount} conflicts</span>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <canvas 
          ref={canvasRef}
          width={280}
          height={300}
          className="w-full h-full"
        />
        
        {/* Legend */}
        <div className="absolute bottom-2 left-2 right-2 bg-gray-900/90 border border-gray-800 rounded p-2 text-[8px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-green-500"></span>
            <span className="text-gray-400">Alliance (+30)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-red-500 border-dashed" style={{borderTop: '1px dashed #ef4444', height: 0}}></span>
            <span className="text-gray-400">Hostile (-30)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-red-600"></span>
            <span className="text-gray-400">Grudge (betrayal)</span>
          </div>
        </div>
      </div>
      
      {/* Relationship Summary */}
      <div className="h-auto max-h-24 border-t border-gray-800 overflow-y-auto p-2 space-y-1">
        {edges.filter(e => e.type !== 'neutral').slice(0, 5).map((edge, i) => {
          const source = agents.find(a => a.id === edge.source);
          const target = agents.find(a => a.id === edge.target);
          if (!source || !target) return null;
          
          return (
            <div key={i} className="text-[9px] flex items-center gap-1">
              <span className={edge.type === 'alliance' ? 'text-green-500' : 'text-red-500'}>
                {edge.type === 'alliance' ? '◆' : edge.type === 'grudge' ? '⚠' : '▲'}
              </span>
              <span className="text-gray-300">{source.name.split(' ')[0]}</span>
              <span className="text-gray-500">{edge.type === 'alliance' ? '↔' : '↮'}</span>
              <span className="text-gray-300">{target.name.split(' ')[0]}</span>
              <span className="text-gray-600 ml-auto">{Math.round(edge.strength)}</span>
            </div>
          );
        })}
        {edges.filter(e => e.type !== 'neutral').length === 0 && (
          <div className="text-[9px] text-gray-600 italic text-center">No significant relationships yet...</div>
        )}
      </div>
    </div>
  );
};
