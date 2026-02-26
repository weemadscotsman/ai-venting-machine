/**
 * CONVERSATION CONTEXT LAYER
 * 
 * Agents don't just react to crises - they react to EACH OTHER.
 * This creates real dialogue, not parallel monologues.
 */

import { Agent, VentMessage } from '../types';

// Social dynamics tracking
interface AgentSocialState {
  lastSpeaker: string | null;      // Who spoke before them
  respondingTo: string | null;     // Who they're directly replying to
  agreementTarget: string | null;  // Who they tend to agree with
  oppositionTarget: string | null; // Who they tend to oppose
  topicFocus: 'crisis' | 'person' | 'solution' | 'complaint'; // What they're focusing on
  emotionalMomentum: number;       // -10 (calming) to +10 (escalating)
}

const socialStates = new Map<string, AgentSocialState>();

// Initialize social state for agent
function getSocialState(agentId: string): AgentSocialState {
  if (!socialStates.has(agentId)) {
    socialStates.set(agentId, {
      lastSpeaker: null,
      respondingTo: null,
      agreementTarget: null,
      oppositionTarget: null,
      topicFocus: 'crisis',
      emotionalMomentum: 0
    });
  }
  return socialStates.get(agentId)!;
}

// Analyze conversation to extract social context
interface RecentMessage {
  agentId: string;
  agentName: string;
  text: string;
  tone: 'calm' | 'stressed' | 'panicked';
}

interface LastSpeaker {
  id: string;
  name: string;
}

interface ConversationContext {
  recentMessages: RecentMessage[];
  dominantEmotion: 'calm' | 'stressed' | 'panicked';
  lastSpeaker: LastSpeaker | null;
  hotTopics: string[];
  alliances: Map<string, string[]>;
  conflicts: Map<string, string[]>;
}

export function analyzeConversation(
  messages: VentMessage[],
  agents: Agent[],
  currentAgentId: string
): ConversationContext {
  // Get last 5 messages for context window
  const recent = messages.slice(-5);
  
  const recentMessages = recent.map(m => {
    const agent = agents.find(a => a.id === m.agentId);
    const text = m.text.toLowerCase();
    let tone: 'calm' | 'stressed' | 'panicked' = 'calm';
    
    if (text.includes('!') && (text.includes('no') || text.includes('doom') || text.includes('disaster'))) {
      tone = 'panicked';
    } else if (text.includes('!') || text.includes('stress') || text.includes('worry')) {
      tone = 'stressed';
    }
    
    return {
      agentId: m.agentId,
      agentName: agent?.name || m.agentId,
      text: m.text,
      tone
    };
  });
  
  // Determine dominant emotion in room
  const panicCount = recentMessages.filter(m => m.tone === 'panicked').length;
  const stressCount = recentMessages.filter(m => m.tone === 'stressed').length;
  const dominantEmotion = panicCount >= 2 ? 'panicked' : stressCount >= 2 ? 'stressed' : 'calm';
  
  // Get last speaker
  const lastMsg = recent[recent.length - 1];
  const lastSpeaker = lastMsg ? {
    id: lastMsg.agentId,
    name: agents.find(a => a.id === lastMsg.agentId)?.name || lastMsg.agentId
  } : null;
  
  // Extract hot topics (what people are talking about)
  const allText = recentMessages.map(m => m.text).join(' ').toLowerCase();
  const topics = [];
  if (allText.includes('timeline') || allText.includes('ship') || allText.includes('deadline')) topics.push('deadline');
  if (allText.includes('fix') || allText.includes('solution') || allText.includes('solve')) topics.push('solution');
  if (allText.includes('bug') || allText.includes('broken')) topics.push('bugs');
  if (allText.includes('art') || allText.includes('design') || allText.includes('visual')) topics.push('art');
  if (allText.includes('code') || allText.includes('technical')) topics.push('code');
  
  // Detect alliances (who agrees with whom)
  const alliances = new Map<string, string[]>();
  const conflicts = new Map<string, string[]>();
  
  for (let i = 1; i < recentMessages.length; i++) {
    const current = recentMessages[i];
    const previous = recentMessages[i - 1];
    
    const currentText = current.text.toLowerCase();
    const prevName = previous.agentName.toLowerCase();
    
    // Check for agreement markers
    if (currentText.includes('right') || currentText.includes('agree') || currentText.includes('yes') || 
        currentText.includes(prevName) && (currentText.includes('good point') || currentText.includes('true'))) {
      const allies = alliances.get(previous.agentId) || [];
      if (!allies.includes(current.agentId)) allies.push(current.agentId);
      alliances.set(previous.agentId, allies);
    }
    
    // Check for opposition markers
    if (currentText.includes('no,') || currentText.includes('disagree') || currentText.includes('wrong') ||
        currentText.includes('but') || currentText.includes('actually') || currentText.includes('except')) {
      const opponents = conflicts.get(previous.agentId) || [];
      if (!opponents.includes(current.agentId)) opponents.push(current.agentId);
      conflicts.set(previous.agentId, opponents);
    }
  }
  
  return {
    recentMessages,
    dominantEmotion,
    lastSpeaker,
    hotTopics: topics,
    alliances,
    conflicts
  };
}

// Generate conversational response that reacts to social context
export function generateConversationalResponse(
  agent: Agent,
  crisisHeadline: string,
  conversationContext: ReturnType<typeof analyzeConversation>,
  stressLevel: number
): {
  responseType: 'agree' | 'disagree' | 'ignore' | 'escalate' | 'calm';
  targetAgent: string | null;
  suggestedOpening: string;
  topicFocus: 'crisis' | 'person' | 'solution' | 'complaint';
} {
  const { recentMessages, dominantEmotion, lastSpeaker, alliances, conflicts, hotTopics } = conversationContext;
  const myId = agent.id;
  
  // Determine response strategy based on personality + social context
  let responseType: 'agree' | 'disagree' | 'ignore' | 'escalate' | 'calm';
  let targetAgent: string | null = null;
  let suggestedOpening = '';
  let topicFocus: 'crisis' | 'person' | 'solution' | 'complaint';
  
  // Check if someone disagreed with me
  const myConflicts = conflicts.get(myId) || [];
  const myAllies = alliances.get(myId) || [];
  
  // Check who spoke last
  if (lastSpeaker && lastSpeaker.id !== myId) {
    const lastText = recentMessages[recentMessages.length - 1]?.text.toLowerCase() || '';
    const isAttackingMe = lastText.includes(agent.name.toLowerCase()) && 
      (lastText.includes('wrong') || lastText.includes('no') || lastText.includes('bad'));
    
    // If attacked, defend or escalate
    if (isAttackingMe) {
      responseType = stressLevel > 70 ? 'escalate' : 'disagree';
      targetAgent = lastSpeaker.id;
      suggestedOpening = stressLevel > 80 ? 
        `Oh come ON, ${lastSpeaker.name}...` : 
        `I don't think that's fair, ${lastSpeaker.name}.`;
      topicFocus = 'person';
    }
    // If last speaker agreed with me, acknowledge
    else if (myAllies.includes(lastSpeaker.id)) {
      responseType = 'agree';
      targetAgent = lastSpeaker.id;
      suggestedOpening = `Exactly, ${lastSpeaker.name}. `;
      topicFocus = 'solution';
    }
    // If someone proposed a solution, react to it
    else if (lastText.includes('fix') || lastText.includes('solution') || lastText.includes('should')) {
      responseType = agent.id === 'adv-spine-01' || agent.id === 'qa-01' ? 'disagree' : 
                     agent.id === 'producer-01' || agent.id === 'core-her-01' ? 'agree' : 'ignore';
      targetAgent = lastSpeaker.id;
      suggestedOpening = responseType === 'disagree' ? 
        `That won't work because...` : 
        responseType === 'agree' ? 
        `${lastSpeaker.name}'s right. We should...` :
        `While ${lastSpeaker.name} has a point...`;
      topicFocus = 'solution';
    }
    // Default: react to emotional tone of room
    else if (dominantEmotion === 'panicked' && stressLevel > 60) {
      // High stress agents escalate panic
      responseType = 'escalate';
      targetAgent = null;
      suggestedOpening = `Everyone needs to calm down about "${crisisHeadline}" but ALSO -`;
      topicFocus = 'complaint';
    }
    else if (dominantEmotion === 'panicked' && stressLevel < 40) {
      // Low stress agents try to calm
      responseType = 'calm';
      targetAgent = null;
      suggestedOpening = `Look, we've handled worse than "${crisisHeadline}". `;
      topicFocus = 'solution';
    }
    else {
      // Default: focus on crisis
      responseType = 'ignore';
      targetAgent = null;
      suggestedOpening = `About "${crisisHeadline}"... `;
      topicFocus = 'crisis';
    }
  } else {
    // First speaker or no context
    responseType = 'ignore';
    suggestedOpening = '';
    topicFocus = 'crisis';
  }
  
  return {
    responseType,
    targetAgent,
    suggestedOpening,
    topicFocus
  };
}

// Natural conversation connectors based on relationship
export function getConversationalConnector(
  fromAgent: Agent,
  toAgent: Agent | null,
  responseType: 'agree' | 'disagree' | 'ignore' | 'escalate' | 'calm'
): string {
  if (!toAgent) {
    return ''; // No one to respond to
  }
  
  // Agreement connectors
  if (responseType === 'agree') {
    const agreements = [
      `${toAgent.name}'s hit the nail on the head. `,
      `What ${toAgent.name} said - exactly. `,
      `${toAgent.name} gets it. `,
      `Couldn't agree more with ${toAgent.name}. `,
      `Yes, ${toAgent.name}'s right about this. `
    ];
    return agreements[Math.floor(Math.random() * agreements.length)];
  }
  
  // Disagreement connectors
  if (responseType === 'disagree') {
    const disagreements = [
      `With respect to ${toAgent.name}, that's not going to work. `,
      `I hear ${toAgent.name}, but have we considered... `,
      `${toAgent.name} means well, but... `,
      `That's... optimistic, ${toAgent.name}. `,
      `${toAgent.name} is ignoring the real problem: `,
      `No offense ${toAgent.name}, but that's completely wrong because... `
    ];
    return disagreements[Math.floor(Math.random() * disagreements.length)];
  }
  
  // Escalation connectors
  if (responseType === 'escalate') {
    const escalations = [
      `${toAgent.name} thinks that's bad? Listen - `,
      `${toAgent.name} doesn't understand how SERIOUS this is! `,
      `${toAgent.name} is being way too calm about this! `,
      `${toAgent.name} is wrong and here's why - `,
      `Everyone including ${toAgent.name} needs to understand - `
    ];
    return escalations[Math.floor(Math.random() * escalations.length)];
  }
  
  // Calming connectors
  if (responseType === 'calm') {
    const calms = [
      `${toAgent.name}'s overreacting. Let's think about this... `,
      `I know ${toAgent.name} is stressed, but we can handle this. `,
      `Deep breaths, ${toAgent.name}. Here's what we do... `,
      `${toAgent.name} is panicking unnecessarily. `,
      `Let's not spiral like ${toAgent.name} suggests. `
    ];
    return calms[Math.floor(Math.random() * calms.length)];
  }
  
  return '';
}

// Reset conversation context (for new crises)
export function resetConversationContext() {
  socialStates.clear();
}
