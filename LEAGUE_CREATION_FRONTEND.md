# League creation — frontend reimplementation

Backend contract and ready-to-use form code for **POST /leagues** (100% aligned with the current League schema).

---

## 1. API contract

**Endpoint:** `POST /leagues`  
**Content-Type:** `application/json`

### Request body (CreateLeagueDto)

| Field        | Type   | Required | Validation |
|-------------|--------|----------|------------|
| `name`      | string | ✅       | Non-empty |
| `level`     | enum   | ✅       | One of: `INTERNATIONAL`, `CONTINENTAL`, `NATIONAL`, `REGIONAL` |
| `regionId`  | string | ❌       | Depends on `level`: see below |
| `gameId`    | string | ✅       | Non-empty (Catalog `_id`) |
| `description` | string | ❌    | - |
| `logoUrl`   | string | ❌       | - |

### regionId rules (backend)

- **INTERNATIONAL:** `regionId` must be empty or exactly `"Global"`.
- **CONTINENTAL:** `regionId` must be one of: `Africa`, `Antarctica`, `Asia`, `Europe`, `North America`, `Oceania`, `South America`.
- **NATIONAL:** `regionId` must be one of the countries list (e.g. `France`, `Tunisia`, `United States of America`).
- **REGIONAL:** `regionId` must be non-empty (any string).

### Response

- **201:** `{ _id, name, level, regionId, gameId, description?, logoUrl?, createdAt, updatedAt }`
- **400:** Validation error (message in body)

---

## 2. TypeScript types

```ts
export type LeagueLevel = 'INTERNATIONAL' | 'CONTINENTAL' | 'NATIONAL' | 'REGIONAL';

export interface CreateLeaguePayload {
  name: string;
  level: LeagueLevel;
  regionId?: string;
  gameId: string;
  description?: string;
  logoUrl?: string;
}

export interface League {
  _id: string;
  name: string;
  level: LeagueLevel;
  regionId: string;
  gameId: string;
  description?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 3. Region options (match backend constants)

```ts
export const LEAGUE_LEVELS: { value: LeagueLevel; label: string }[] = [
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'CONTINENTAL', label: 'Continental' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'REGIONAL', label: 'Regional' },
];

// For INTERNATIONAL only
export const INTERNATIONAL_REGION = 'Global';

// For CONTINENTAL — geographic continents + Valorant/VCT esports regions
export const CONTINENTAL_REGIONS = [
  'Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America',
  'EMEA', 'Americas', 'Pacific', 'CN',  // Valorant/Riot continental
];

// For NATIONAL — use your full countries list (same as backend COUNTRIES)
// For REGIONAL — free text
```

---

## 4. React form component (copy-paste)

Assumes you have `api` (base URL or axios instance) and a list of games (catalog) for `gameId`. Replace `api.post` and `games` with your real API and data source.

```tsx
import React, { useState, useMemo } from 'react';

type LeagueLevel = 'INTERNATIONAL' | 'CONTINENTAL' | 'NATIONAL' | 'REGIONAL';

const LEAGUE_LEVELS: { value: LeagueLevel; label: string }[] = [
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'CONTINENTAL', label: 'Continental' },
  { value: 'NATIONAL', label: 'National' },
  { value: 'REGIONAL', label: 'Regional' },
];

const CONTINENTAL_REGIONS = [
  'Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America',
  'EMEA', 'Americas', 'Pacific', 'CN',
];

// Replace with your full list from backend COUNTRIES for NATIONAL
const COUNTRIES = ['France', 'Tunisia', 'United States of America', 'Germany', 'United Kingdom', 'Japan', 'South Korea', 'Brazil', 'Spain', 'Italy'];

interface GameOption {
  _id: string;
  title: string;
}

interface LeagueFormProps {
  games: GameOption[];
  apiBaseUrl?: string;
  onSuccess?: (league: any) => void;
  onError?: (err: any) => void;
}

export function LeagueCreateForm({ games, apiBaseUrl = '', onSuccess, onError }: LeagueFormProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<LeagueLevel>('CONTINENTAL');
  const [regionId, setRegionId] = useState('');
  const [gameId, setGameId] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionOptions = useMemo(() => {
    if (level === 'INTERNATIONAL') return [{ value: 'Global', label: 'Global' }];
    if (level === 'CONTINENTAL') return CONTINENTAL_REGIONS.map((c) => ({ value: c, label: c }));
    if (level === 'NATIONAL') return COUNTRIES.map((c) => ({ value: c, label: c }));
    return []; // REGIONAL: free text, no dropdown
  }, [level]);

  const needRegion = level === 'REGIONAL' || (level !== 'INTERNATIONAL' && regionOptions.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!gameId) {
      setError('Please select a game');
      return;
    }
    if (level === 'REGIONAL' && !regionId.trim()) {
      setError('Region is required for Regional leagues');
      return;
    }
    if (level === 'CONTINENTAL' && !regionId) {
      setError('Please select a continent');
      return;
    }
    if (level === 'NATIONAL' && !regionId) {
      setError('Please select a country');
      return;
    }

    const payload: Record<string, string> = {
      name: name.trim(),
      level,
      gameId,
    };
    if (level === 'INTERNATIONAL') {
      payload.regionId = regionId || 'Global';
    } else if (regionId) {
      payload.regionId = regionId;
    }
    if (description.trim()) payload.description = description.trim();
    if (logoUrl.trim()) payload.logoUrl = logoUrl.trim();

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || res.statusText || 'Failed to create league');
        onError?.(data);
        return;
      }
      onSuccess?.(data);
      setName('');
      setLevel('CONTINENTAL');
      setRegionId('');
      setGameId('');
      setDescription('');
      setLogoUrl('');
    } catch (err: any) {
      setError(err.message || 'Network error');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <label>
        Name *
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. VCT EMEA"
          required
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>

      <label>
        Level *
        <select
          value={level}
          onChange={(e) => { setLevel(e.target.value as LeagueLevel); setRegionId(''); }}
          required
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          {LEAGUE_LEVELS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {level === 'INTERNATIONAL' && (
        <label>
          Region (optional for International)
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            <option value="">Global</option>
            <option value="Global">Global</option>
          </select>
        </label>
      )}

      {level === 'CONTINENTAL' && (
        <label>
          Region (continent or esports) *
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            <option value="">Select region</option>
            {CONTINENTAL_REGIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      )}

      {level === 'NATIONAL' && (
        <label>
          Country *
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          >
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      )}

      {level === 'REGIONAL' && (
        <label>
          Region name *
          <input
            type="text"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            placeholder="e.g. EMEA, North"
            required
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
      )}

      <label>
        Game *
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          required
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          <option value="">Select game</option>
          {games.map((g) => (
            <option key={g._id} value={g._id}>{g.title}</option>
          ))}
        </select>
      </label>

      <label>
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description of the league"
          rows={3}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>

      <label>
        Logo URL (optional)
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create league'}
      </button>
    </form>
  );
}
```

---

## 5. Minimal usage

```tsx
// Fetch games from GET /catalog then:
<LeagueCreateForm
  games={catalogGames}
  apiBaseUrl="http://localhost:3000"  // or your API base URL
  onSuccess={(league) => {
    console.log('Created', league);
    // e.g. navigate or refresh list
  }}
  onError={(err) => console.error(err)}
/>
```

---

## 6. Summary: what changed vs “old” league shape

- **Required:** `name`, `level`, `gameId`. `regionId` is required by schema but validated by level (use `Global` or leave empty for International; use backend CONTINENTS for Continental; COUNTRIES for National; any non-empty string for Regional).
- **No longer in backend:** things like `format`, `startDate`, `endDate`, `maxTeams`, `status` — those live on **Season**, not League.
- **Optional:** `description`, `logoUrl`.  
Use the types and form above to match the backend 100%.
