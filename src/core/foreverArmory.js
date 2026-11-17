const config = require('../config/config');

/**
 * WoW Forever armory lookups through the Blizzard profile API.
 *
 * Forever has no realms: a character is addressed by "{first}-{surname}" in
 * lowercase, under the "profile-forever-{region}" namespace. Blizzard has not
 * documented this API yet, so every field read here is optional.
 *
 * Characters only show up once they reach level 10 and log out, so a
 * "not found" result for a brand new player is normal.
 */

const TOKEN_URL = 'https://oauth.battle.net/token';
const REQUEST_TIMEOUT_MS = 10000;

let cachedToken = null; // { value, expiresAt }

function isConfigured() {
  return Boolean(config.blizzardClientId && config.blizzardClientSecret);
}

function getRegion() {
  return (config.blizzardRegion || 'us').toLowerCase();
}

function buildSlug(firstName, surname) {
  return `${firstName.trim()}-${surname.trim()}`.toLowerCase();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.value;
  }

  const credentials = Buffer.from(`${config.blizzardClientId}:${config.blizzardClientSecret}`).toString('base64');
  const response = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`Blizzard token request failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000
  };
  return cachedToken.value;
}

/**
 * Pulls a display name out of a Blizzard API field, which may be a plain
 * string or an object like { name: "Warrior" } or { name: { en_US: "Warrior" } }.
 */
function readName(field) {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field.name === 'string') return field.name;
  if (field.name && typeof field.name === 'object') {
    return field.name.en_US || Object.values(field.name)[0] || null;
  }
  if (typeof field.type === 'string') return field.type;
  return null;
}

function summarize(data, slug) {
  return {
    name: [data.name, data.surname].filter(Boolean).join(' ') || slug,
    level: data.level ?? null,
    className: readName(data.character_class),
    race: readName(data.race),
    faction: readName(data.faction),
    guild: readName(data.guild),
    ruleset: readName(data.ruleset),
    lastLogin: data.last_login_timestamp ? new Date(data.last_login_timestamp) : null
  };
}

/**
 * Looks up a WoW Forever character.
 * @returns {Promise<{status: 'found', character: object} | {status: 'not_found'} | {status: 'not_configured'} | {status: 'error', message: string}>}
 */
async function lookupForeverCharacter(firstName, surname) {
  if (!isConfigured()) {
    return { status: 'not_configured' };
  }
  if (!firstName || !surname) {
    return { status: 'error', message: 'A first name and surname are both needed for a Forever lookup.' };
  }

  const region = getRegion();
  const slug = buildSlug(firstName, surname);
  const url = `https://${region}.api.blizzard.com/profile/wow/character/${encodeURIComponent(slug)}` +
    `?namespace=profile-forever-${region}&locale=en_US`;

  try {
    const token = await getAccessToken();
    const response = await fetchWithTimeout(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 404) {
      return { status: 'not_found' };
    }
    if (response.status === 401) {
      cachedToken = null; // Token may have been revoked; get a fresh one next time
    }
    if (!response.ok) {
      return { status: 'error', message: `Blizzard API returned HTTP ${response.status}` };
    }

    const data = await response.json();
    return { status: 'found', character: summarize(data, slug) };
  } catch (error) {
    const message = error.name === 'AbortError' ? 'Blizzard API timed out' : error.message;
    return { status: 'error', message };
  }
}

/**
 * Splits a Discord nickname like "Thrall Doomhammer" into first name and surname.
 * Returns null when the nickname has no surname.
 */
function splitCharacterName(displayName) {
  const parts = (displayName || '').trim().split(/\s+/);
  if (parts.length < 2) return null;
  return { firstName: parts[0], surname: parts.slice(1).join(' ') };
}

/**
 * Turns a lookup result into embed fields for Discord.
 */
function describeLookupResult(result) {
  switch (result.status) {
    case 'found': {
      const c = result.character;
      const fields = [
        { name: 'Character', value: c.name, inline: true },
        { name: 'Level', value: c.level != null ? String(c.level) : 'Unknown', inline: true },
        { name: 'Class', value: c.className || 'Unknown', inline: true }
      ];
      if (c.race) fields.push({ name: 'Race', value: c.race, inline: true });
      if (c.faction) fields.push({ name: 'Faction', value: c.faction, inline: true });
      if (c.ruleset) fields.push({ name: 'Ruleset', value: c.ruleset, inline: true });
      fields.push({ name: 'Guild', value: c.guild || 'None', inline: true });
      if (c.lastLogin) fields.push({ name: 'Last Seen', value: `<t:${Math.floor(c.lastLogin.getTime() / 1000)}:R>`, inline: true });
      return { found: true, summary: `✅ Found on the WoW Forever armory`, fields };
    }
    case 'not_found':
      return {
        found: false,
        summary: '❔ Not on the WoW Forever armory yet. Characters only appear after reaching level 10 and logging out.',
        fields: []
      };
    case 'not_configured':
      return {
        found: false,
        summary: '⚙️ Armory lookup is off: BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET are not set.',
        fields: []
      };
    default:
      return { found: false, summary: `⚠️ Armory lookup failed: ${result.message}`, fields: [] };
  }
}

module.exports = {
  lookupForeverCharacter,
  splitCharacterName,
  describeLookupResult,
  buildSlug,
  isConfigured
};
