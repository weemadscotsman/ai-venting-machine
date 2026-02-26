/**
 * AGENT SOUL LOADER
 * Loads personality files for each agent
 */

const fs = require('fs');
const path = require('path');

const AGENT_SOULS = {};

function loadSoulFile(agentId) {
    try {
        const filePath = path.join(__dirname, `${agentId}.md`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (e) {
        console.error(`[Soul Loader] Failed to load ${agentId}:`, e.message);
    }
    return null;
}

// Load all agent souls
const agentIds = [
    'visionary-01',
    'producer-01', 
    'dev-lead-01',
    'art-core-01',
    'qa-01',
    'community-01',
    'core-her-01',
    'adv-spine-01',
    'judge-mirror-01',
    'meme-crystal-01'
];

agentIds.forEach(id => {
    const soul = loadSoulFile(id);
    if (soul) {
        AGENT_SOULS[id] = soul;
        console.log(`[Soul Loader] Loaded ${id}`);
    }
});

function getAgentSoul(agentId) {
    return AGENT_SOULS[agentId] || `Agent ${agentId} - No soul file found.`;
}

function getAllSouls() {
    return AGENT_SOULS;
}

module.exports = { getAgentSoul, getAllSouls, AGENT_SOULS };
