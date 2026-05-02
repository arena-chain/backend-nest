import axios from 'axios';

const FALLBACK_DDRAGON_VERSION = '15.10.1';
const VERSION_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedVersion: string | null = null;
let cachedAt = 0;

async function getLatestDDragonVersion(): Promise<string> {
  const now = Date.now();
  if (cachedVersion && now - cachedAt < VERSION_TTL_MS) {
    return cachedVersion;
  }
  try {
    const res = await axios.get<string[]>(
      'https://ddragon.leagueoflegends.com/api/versions.json',
      { timeout: 8000 },
    );
    const versions = res.data;
    const latest = versions?.[0];
    if (typeof latest === 'string' && latest.length > 0) {
      cachedVersion = latest;
      cachedAt = now;
      return latest;
    }
    return FALLBACK_DDRAGON_VERSION;
  } catch {
    return FALLBACK_DDRAGON_VERSION;
  }
}

export async function buildRiotAvatarUrl(
  profileIconId: number | null | undefined,
): Promise<string | null> {
  if (
    profileIconId === null ||
    profileIconId === undefined ||
    Number.isNaN(profileIconId)
  ) {
    return null;
  }
  const version = await getLatestDDragonVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
}
