import { useCallback, useEffect, useMemo, useState } from 'react';
import { connectMetaMaskAndReadAddress } from './metamask';

type Pack = {
    id: string;
    title: string;
    description: string | null;
    grantWholeTokens: number;
    priceCents: number;
    priceCurrency: string;
    active: boolean;
    sortOrder: number;
    createdAt?: string;
};

type Purchase = {
    id: string;
    packId: string;
    packTitle: string;
    wholeTokensGranted: number;
    priceCents: number;
    priceCurrency: string;
    status: string;
    fulfillmentTxHash: string | null;
    createdAt?: string;
};

type LoginUser = {
    id: string;
    email: string;
    nickname?: string;
    role: string;
};

/** Shape from GET /api/currency/game-token/config */
type GameTokenConfig = {
    contractAddress: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
    displayName: string;
    displaySymbol: string;
};

/** GET /api/currency/game-token/me */
type WalletMe = {
    linked: boolean;
    walletAddress: string | null;
    balanceFormatted: string;
    displaySymbol?: string | null;
    hint?: string;
};

function apiUrl(path: string): string {
    const normalized = path.replace(/^\//, '');
    const envBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
    if (envBase) return `${envBase}/api/${normalized}`;
    return `/api/${normalized}`;
}

function formatMoney(cents: number, currency: string): string {
    const v = (cents / 100).toFixed(2);
    return `${v} ${currency}`;
}

function formatHttpErrorBody(data: unknown, fallback: string): string {
    if (typeof data === 'object' && data !== null && 'message' in data) {
        const m = (data as { message: unknown }).message;
        if (Array.isArray(m)) return m.map(String).join(' ');
        if (typeof m === 'string') return m;
    }
    if (typeof data === 'string') return data;
    return fallback;
}

function parseMoneyParts(whole: string, frac: string | undefined): number {
    const w = parseInt(whole, 10) || 0;
    if (!frac) return w * 100;
    const f = frac.replace(/,/g, '').slice(0, 4);
    return Math.round(parseFloat(`${w}.${f}`) * 100);
}

/** Parse display strings like "$4.99", "4,99 €", "9.99 EUR" → cents + ISO currency */
export function parsePriceNote(note: string): { priceCents: number; priceCurrency: string } | null {
    const t = note.trim();
    if (!t) return null;

    const usd = t.match(/^\s*\$\s*(\d+)(?:[.,](\d{1,2}))?\s*$/);
    if (usd) {
        return { priceCents: parseMoneyParts(usd[1], usd[2]), priceCurrency: 'USD' };
    }

    const eur = t.match(/^\s*(\d+)(?:[.,](\d{1,2}))?\s*(€|EUR)\s*$/i);
    if (eur) {
        return { priceCents: parseMoneyParts(eur[1], eur[2]), priceCurrency: 'EUR' };
    }

    const plain = t.match(/^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/);
    if (plain) {
        return { priceCents: parseMoneyParts(plain[1], plain[2]), priceCurrency: 'USD' };
    }

    return null;
}

async function fetchPublicJson(path: string): Promise<unknown> {
    const res = await fetch(apiUrl(path), { method: 'GET' });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
        try {
            data = JSON.parse(text) as unknown;
        } catch {
            data = text;
        }
    }
    if (!res.ok) {
        throw new Error(formatHttpErrorBody(data, res.statusText) || `HTTP ${res.status}`);
    }
    return data;
}

export function App() {
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('cp_access_token'));
    const [user, setUser] = useState<LoginUser | null>(() => {
        const raw = sessionStorage.getItem('cp_user');
        if (!raw) return null;
        try {
            return JSON.parse(raw) as LoginUser;
        } catch {
            return null;
        }
    });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [tab, setTab] = useState<'player' | 'admin'>('player');
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const [tokenMeta, setTokenMeta] = useState<GameTokenConfig | null>(null);
    const [tokenMetaErr, setTokenMetaErr] = useState<string | null>(null);

    const [storePacks, setStorePacks] = useState<Pack[]>([]);
    const [adminPacks, setAdminPacks] = useState<Pack[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [walletMe, setWalletMe] = useState<WalletMe | null>(null);
    const [walletErr, setWalletErr] = useState<string | null>(null);
    const [walletLinkBusy, setWalletLinkBusy] = useState(false);
    const [giftRecipientUserId, setGiftRecipientUserId] = useState('');
    const [giftWholeAmount, setGiftWholeAmount] = useState<number>(10);
    const [giftNote, setGiftNote] = useState('');

    const isAdmin = user?.role === 'admin';
    const chainSymbol = tokenMeta?.displaySymbol || tokenMeta?.symbol || 'GTK';

    const authHeaders = useMemo(() => {
        if (!token) return {} as Record<string, string>;
        return { Authorization: `Bearer ${token}` };
    }, [token]);

    const persistSession = useCallback((accessToken: string, u: LoginUser) => {
        sessionStorage.setItem('cp_access_token', accessToken);
        sessionStorage.setItem('cp_user', JSON.stringify(u));
        setToken(accessToken);
        setUser(u);
    }, []);

    const logout = useCallback(() => {
        sessionStorage.removeItem('cp_access_token');
        sessionStorage.removeItem('cp_user');
        setToken(null);
        setUser(null);
        setStorePacks([]);
        setAdminPacks([]);
        setPurchases([]);
        setWalletMe(null);
        setWalletErr(null);
        setWalletLinkBusy(false);
        setTab('player');
    }, []);

    const apiJson = useCallback(
        async (path: string, init?: RequestInit) => {
            const res = await fetch(apiUrl(path), {
                ...init,
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                    ...(init?.headers || {}),
                },
            });
            const text = await res.text();
            let data: unknown = null;
            if (text) {
                try {
                    data = JSON.parse(text) as unknown;
                } catch {
                    data = text;
                }
            }
            if (!res.ok) {
                throw new Error(formatHttpErrorBody(data, res.statusText) || `HTTP ${res.status}`);
            }
            return data;
        },
        [authHeaders],
    );

    const loadTokenConfig = useCallback(async () => {
        setTokenMetaErr(null);
        try {
            const meta = (await fetchPublicJson('currency/game-token/config')) as GameTokenConfig;
            setTokenMeta(meta);
        } catch (e) {
            setTokenMeta(null);
            setTokenMetaErr(e instanceof Error ? e.message : 'Token config unavailable');
        }
    }, []);

    const loadStore = useCallback(async () => {
        const data = (await fetchPublicJson('currency/packs')) as { packs: Pack[] };
        setStorePacks(data.packs || []);
    }, []);

    const loadPurchases = useCallback(async () => {
        if (!token) return;
        const data = (await apiJson('currency/packs/my/purchases', { method: 'GET' })) as {
            purchases: Purchase[];
        };
        setPurchases(data.purchases || []);
    }, [apiJson, token]);

    const loadWalletMe = useCallback(async () => {
        if (!token) {
            setWalletMe(null);
            setWalletErr(null);
            return;
        }
        setWalletErr(null);
        try {
            const data = (await apiJson('currency/game-token/me', { method: 'GET' })) as WalletMe;
            setWalletMe(data);
        } catch (e) {
            setWalletMe(null);
            setWalletErr(e instanceof Error ? e.message : 'Wallet unavailable');
        }
    }, [apiJson, token]);

    const linkMetaMaskWallet = useCallback(async () => {
        if (!token || !tokenMeta) {
            setMessage({ type: 'err', text: 'Token / chain config is still loading. Try again in a moment.' });
            return;
        }
        setWalletLinkBusy(true);
        setMessage(null);
        try {
            const addr = await connectMetaMaskAndReadAddress(tokenMeta.chainId);
            await apiJson('currency/game-token/wallet', {
                method: 'PATCH',
                body: JSON.stringify({ walletAddress: addr }),
            });
            await loadWalletMe();
            setMessage({
                type: 'ok',
                text: 'MetaMask linked — your VEX balance will update from the chain.',
            });
        } catch (e) {
            setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Could not link MetaMask' });
        } finally {
            setWalletLinkBusy(false);
        }
    }, [apiJson, loadWalletMe, token, tokenMeta]);

    const loadAdminPacks = useCallback(async () => {
        if (!token || !isAdmin) return;
        const data = (await apiJson('currency/packs/manage', { method: 'GET' })) as { packs: Pack[] };
        setAdminPacks(data.packs || []);
    }, [apiJson, isAdmin, token]);

    const refreshAll = useCallback(async () => {
        await loadTokenConfig();
        await loadStore();
        if (token) {
            await loadPurchases();
            await loadWalletMe();
        }
        if (token && isAdmin) await loadAdminPacks();
    }, [isAdmin, loadAdminPacks, loadPurchases, loadStore, loadTokenConfig, loadWalletMe, token]);

    useEffect(() => {
        void loadTokenConfig();
    }, [loadTokenConfig]);

    useEffect(() => {
        void loadStore();
    }, [loadStore]);

    useEffect(() => {
        if (token) void loadPurchases();
    }, [loadPurchases, token]);

    useEffect(() => {
        if (token) void loadWalletMe();
    }, [loadWalletMe, token]);

    useEffect(() => {
        if (token && isAdmin) void loadAdminPacks();
    }, [isAdmin, loadAdminPacks, token]);

    const onLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setLoading(true);
        try {
            const data = (await fetch(apiUrl('auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            }).then(async (res) => {
                const text = await res.text();
                const body = text ? (JSON.parse(text) as unknown) : null;
                if (!res.ok) {
                    throw new Error(formatHttpErrorBody(body, res.statusText));
                }
                return body;
            })) as {
                accessToken: string;
                user: { id: string; email: string; nickname?: string; role: string };
            };
            persistSession(data.accessToken, {
                id: String(data.user.id),
                email: data.user.email,
                nickname: data.user.nickname,
                role: data.user.role,
            });
            setMessage({ type: 'ok', text: 'Signed in.' });
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Login failed' });
        } finally {
            setLoading(false);
        }
    };

    const purchasePack = async (packId: string) => {
        setMessage(null);
        setLoading(true);
        try {
            const res = (await apiJson(`currency/packs/${packId}/purchase`, {
                method: 'POST',
                body: '{}',
            })) as { transactionHash?: string; wholeTokensGranted?: number };
            setMessage({
                type: 'ok',
                text: `Purchase complete — ${res.wholeTokensGranted ?? '?'} ${chainSymbol} (tx ${(res.transactionHash || '').slice(0, 14)}…)`,
            });
            await loadStore();
            await loadPurchases();
            await loadWalletMe();
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Purchase failed' });
        } finally {
            setLoading(false);
        }
    };

    const giftSimulated = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!giftRecipientUserId.trim()) {
            setMessage({ type: 'err', text: 'Recipient user id is required.' });
            return;
        }
        if (!(giftWholeAmount > 0)) {
            setMessage({ type: 'err', text: 'Gift amount must be greater than 0.' });
            return;
        }
        setLoading(true);
        try {
            const res = (await apiJson('currency/game-token/gift-simulated', {
                method: 'POST',
                body: JSON.stringify({
                    recipientUserId: giftRecipientUserId.trim(),
                    wholeAmount: giftWholeAmount,
                    note: giftNote.trim() || undefined,
                }),
            })) as { amountFormatted?: string; displaySymbol?: string; toUserId?: string };
            setMessage({
                type: 'ok',
                text: `Gift sent: ${res.amountFormatted ?? giftWholeAmount} ${res.displaySymbol ?? chainSymbol} to ${res.toUserId ?? giftRecipientUserId.trim()}.`,
            });
            setGiftNote('');
            await loadWalletMe();
            await loadPurchases();
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Gift failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout-root">
            <aside className="sidebar">
                <div className="sidebar-brand">ARENA</div>
                {token ? (
                    <nav className="sidebar-nav" aria-label="Main">
                        <button type="button" data-active={tab === 'player'} onClick={() => setTab('player')}>
                            Store
                        </button>
                        {isAdmin ? (
                            <button type="button" data-active={tab === 'admin'} onClick={() => setTab('admin')}>
                                Currency offers
                            </button>
                        ) : null}
                    </nav>
                ) : (
                    <p className="muted" style={{ fontSize: '0.8rem', padding: '0 0.5rem', margin: 0 }}>
                        Sign in to open the store and your wallet.
                    </p>
                )}
                {token ? (
                    <SidebarWallet
                        chainSymbol={chainSymbol}
                        chainReady={!!tokenMeta}
                        wallet={walletMe}
                        error={walletErr}
                        purchasesCount={purchases.length}
                        linkBusy={walletLinkBusy}
                        onLinkMetaMask={() => void linkMetaMaskWallet()}
                    />
                ) : null}
            </aside>
            <div className="main-column">
                <div className="app-shell">
            <header className="top-bar">
                <div>
                    <h1 className="page-title">
                        <span className="icon" aria-hidden />
                        Currency offer setup
                    </h1>
                    <p className="subtitle">
                        Live token metadata comes from the API. Offers are stored in MongoDB — admins create rows
                        here; players buy them in the Store tab (mint + ledger on the server when simulation is
                        enabled).
                    </p>
                </div>
                <div className="user-pill">
                    {user ? (
                        <>
                            <strong>{user.nickname || user.email}</strong>
                            <span>{user.role === 'admin' ? 'Super Admin' : user.role}</span>
                            <button type="button" className="btn-ghost" style={{ marginTop: '0.35rem' }} onClick={logout}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <span className="muted">Not signed in</span>
                    )}
                </div>
            </header>

            <div className="card-head" style={{ marginBottom: '0.5rem' }}>
                <span />
                <button type="button" className="btn-refresh" onClick={() => void refreshAll()} disabled={loading}>
                    ↻ Refresh config
                </button>
            </div>

            <LiveTokenSection meta={tokenMeta} error={tokenMetaErr} />

            {!token ? (
                <div className="card login-card" style={{ maxWidth: '22rem' }}>
                    <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Sign in</h2>
                    <p className="muted" style={{ marginTop: 0 }}>
                        Admin: manage offers. Player: buy packs and see wallet history.
                    </p>
                    <form onSubmit={onLogin}>
                        <div className="field-dark">
                            <label>Email or username</label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
                        </div>
                        <div className="field-dark">
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                </div>
            ) : null}

            {message && <p className={message.type === 'ok' ? 'ok' : 'err'}>{message.text}</p>}

            {token && tab === 'player' && (
                <>
                    <div className="card">
                        <div className="card-head">
                            <h2>Store — active offers</h2>
                        </div>
                        {storePacks.length === 0 ? (
                            <p className="muted">No active packs. An admin must create and activate offers.</p>
                        ) : (
                            <table className="offers">
                                <thead>
                                    <tr>
                                        <th>Label</th>
                                        <th>Amount ({chainSymbol})</th>
                                        <th>Price</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {storePacks.map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                <strong>{p.title}</strong>
                                                {p.description ? (
                                                    <div className="muted" style={{ maxWidth: '24rem' }}>
                                                        {p.description}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>{p.grantWholeTokens}</td>
                                            <td>{formatMoney(p.priceCents, p.priceCurrency)}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-add"
                                                    disabled={loading}
                                                    onClick={() => void purchasePack(p.id)}
                                                >
                                                    Buy
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <p className="muted" style={{ marginBottom: 0, marginTop: '0.75rem' }}>
                            Requires a linked inventory wallet and{' '}
                            <span className="mono">GTK_ALLOW_PURCHASE_SIMULATION=true</span> for server mint until
                            payments are integrated.
                        </p>
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <h2>My purchases (wallet)</h2>
                        </div>
                        {purchases.length === 0 ? (
                            <p className="muted">No purchases yet.</p>
                        ) : (
                            <table className="offers">
                                <thead>
                                    <tr>
                                        <th>Offer</th>
                                        <th>Tokens</th>
                                        <th>Paid</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((x) => (
                                        <tr key={x.id}>
                                            <td>{x.packTitle}</td>
                                            <td>{x.wholeTokensGranted}</td>
                                            <td>{formatMoney(x.priceCents, x.priceCurrency)}</td>
                                            <td>{x.status}</td>
                                            <td className="muted">{x.createdAt?.slice(0, 19) || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="card">
                        <div className="card-head">
                            <h2>Gift {chainSymbol} (simulated)</h2>
                        </div>
                        <form className="offer-form" onSubmit={giftSimulated}>
                            <div className="field-dark">
                                <label>Recipient user id</label>
                                <input
                                    value={giftRecipientUserId}
                                    onChange={(e) => setGiftRecipientUserId(e.target.value)}
                                    placeholder="665f1a7a30ad5d41e32e11b1"
                                    required
                                />
                            </div>
                            <div className="field-dark">
                                <label>Amount ({chainSymbol})</label>
                                <input
                                    type="number"
                                    min={0.000001}
                                    step="0.000001"
                                    value={giftWholeAmount}
                                    onChange={(e) => setGiftWholeAmount(Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="field-dark">
                                <label>Note (optional)</label>
                                <input
                                    value={giftNote}
                                    onChange={(e) => setGiftNote(e.target.value)}
                                    maxLength={120}
                                    placeholder="GG for yesterday match"
                                />
                            </div>
                            <button type="submit" className="btn-add" disabled={loading}>
                                Send gift
                            </button>
                        </form>
                        <p className="muted" style={{ marginBottom: 0 }}>
                            Uses <span className="mono">/api/currency/game-token/gift-simulated</span>. This is fake-money ledger
                            transfer for testing (requires <span className="mono">GTK_ALLOW_ECONOMY_SIMULATION=true</span>).
                        </p>
                    </div>
                </>
            )}

            {token && tab === 'admin' && isAdmin && (
                <AdminOfferSetup
                    loading={loading}
                    setLoading={setLoading}
                    setMessage={setMessage}
                    adminPacks={adminPacks}
                    reload={() => void loadAdminPacks()}
                    onOfferCreated={() => {
                        void loadStore();
                        void loadAdminPacks();
                    }}
                    apiJson={apiJson}
                    chainSymbol={chainSymbol}
                />
            )}
                </div>
            </div>
        </div>
    );
}

function SidebarWallet(props: {
    chainSymbol: string;
    chainReady: boolean;
    wallet: WalletMe | null;
    error: string | null;
    purchasesCount: number;
    linkBusy: boolean;
    onLinkMetaMask: () => void;
}) {
    const { chainSymbol, chainReady, wallet, error, purchasesCount, linkBusy, onLinkMetaMask } = props;
    const sym = wallet?.displaySymbol || chainSymbol;
    return (
        <div className="sidebar-wallet">
            <h3>Wallet</h3>
            {error ? (
                <p className="err" style={{ margin: 0, fontSize: '0.78rem' }}>
                    {error}
                </p>
            ) : !wallet ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
                    Loading…
                </p>
            ) : (
                <>
                    <div className="bal">
                        {wallet.balanceFormatted} {sym}
                    </div>
                    {!(wallet.linked && wallet.walletAddress) ? (
                        <div className="hint">
                            No wallet linked yet. Use the button below to pick an account in MetaMask and save it to
                            this profile for GTK balance and mints.
                        </div>
                    ) : null}
                    {wallet.hint ? <div className="hint">{wallet.hint}</div> : null}
                    <button
                        type="button"
                        className="btn-mm"
                        disabled={linkBusy || !chainReady}
                        onClick={onLinkMetaMask}
                    >
                        {linkBusy
                            ? 'Linking…'
                            : wallet.linked && wallet.walletAddress
                              ? 'Reconnect / change MetaMask'
                              : 'Connect MetaMask & link'}
                    </button>
                    {!chainReady ? (
                        <div className="hint" style={{ marginTop: '0.35rem' }}>
                            Waiting for chain config from the API…
                        </div>
                    ) : (
                        <div className="hint" style={{ marginTop: '0.35rem' }}>
                            Switches MetaMask to the same chain ID as the live token, then saves the selected account
                            on the server.
                        </div>
                    )}
                    <div className="purchases-line">Pack purchases (recorded): {purchasesCount}</div>
                </>
            )}
        </div>
    );
}

function LiveTokenSection(props: { meta: GameTokenConfig | null; error: string | null }) {
    const { meta, error } = props;
    return (
        <div className="card">
            <div className="card-head">
                <h2>Live token (API)</h2>
            </div>
            {error ? (
                <p className="err">{error}</p>
            ) : !meta ? (
                <p className="muted">Loading…</p>
            ) : (
                <dl className="token-grid">
                    <div>
                        <dt>Symbol</dt>
                        <dd>{meta.displaySymbol || meta.symbol}</dd>
                    </div>
                    <div>
                        <dt>Name</dt>
                        <dd>{meta.displayName || meta.name}</dd>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <dt>Contract</dt>
                        <dd className="mono">{meta.contractAddress}</dd>
                    </div>
                    <div>
                        <dt>Chain ID</dt>
                        <dd>{String(meta.chainId)}</dd>
                    </div>
                </dl>
            )}
        </div>
    );
}

function AdminOfferSetup(props: {
    loading: boolean;
    setLoading: (v: boolean) => void;
    setMessage: (m: { type: 'ok' | 'err'; text: string } | null) => void;
    adminPacks: Pack[];
    reload: () => void;
    onOfferCreated: () => void;
    apiJson: (path: string, init?: RequestInit) => Promise<unknown>;
    chainSymbol: string;
}) {
    const { loading, setLoading, setMessage, adminPacks, reload, onOfferCreated, apiJson, chainSymbol } = props;
    const [label, setLabel] = useState('');
    const [amountGtk, setAmountGtk] = useState(100);
    const [priceNote, setPriceNote] = useState('');

    const addOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        const parsed = parsePriceNote(priceNote);
        if (!parsed) {
            setMessage({
                type: 'err',
                text: 'Could not parse price note. Try e.g. $4.99, 4,99 €, or 9.99 EUR',
            });
            return;
        }
        setLoading(true);
        try {
            await apiJson('currency/packs', {
                method: 'POST',
                body: JSON.stringify({
                    title: label.trim(),
                    description: priceNote.trim() ? `Price note: ${priceNote.trim()}` : undefined,
                    grantWholeTokens: Math.floor(amountGtk),
                    priceCents: parsed.priceCents,
                    priceCurrency: parsed.priceCurrency,
                    sortOrder: 0,
                    active: true,
                }),
            });
            setMessage({ type: 'ok', text: 'Offer created.' });
            setLabel('');
            setPriceNote('');
            setAmountGtk(100);
            reload();
            onOfferCreated();
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (p: Pack) => {
        setMessage(null);
        setLoading(true);
        try {
            await apiJson(`currency/packs/${p.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !p.active }),
            });
            reload();
            onOfferCreated();
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    const removePack = async (id: string) => {
        if (!confirm('Delete this offer?')) return;
        setMessage(null);
        setLoading(true);
        try {
            await apiJson(`currency/packs/${id}`, { method: 'DELETE' });
            setMessage({ type: 'ok', text: 'Offer deleted.' });
            reload();
            onOfferCreated();
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Request failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-head">
                <h2>Offers</h2>
            </div>
            <form className="offer-form" onSubmit={addOffer}>
                <div className="field-dark">
                    <label>Label</label>
                    <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Starter pack"
                        required
                        minLength={2}
                    />
                </div>
                <div className="field-dark">
                    <label>Amount ({chainSymbol})</label>
                    <input
                        type="number"
                        min={1}
                        value={amountGtk}
                        onChange={(e) => setAmountGtk(Number(e.target.value))}
                        placeholder="100"
                    />
                </div>
                <div className="field-dark">
                    <label>Price note</label>
                    <input
                        value={priceNote}
                        onChange={(e) => setPriceNote(e.target.value)}
                        placeholder="$4.99"
                        required
                    />
                </div>
                <button type="submit" className="btn-add" disabled={loading}>
                    + Add
                </button>
            </form>

            {adminPacks.length === 0 ? (
                <div className="empty-offers">No offers yet. Add a row above.</div>
            ) : (
                <table className="offers" style={{ marginTop: '1rem' }}>
                    <thead>
                        <tr>
                            <th>Label</th>
                            <th>Amount</th>
                            <th>Price</th>
                            <th>Active</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {adminPacks.map((p) => (
                            <tr key={p.id}>
                                <td>{p.title}</td>
                                <td>{p.grantWholeTokens}</td>
                                <td>{formatMoney(p.priceCents, p.priceCurrency)}</td>
                                <td>{p.active ? 'yes' : 'no'}</td>
                                <td className="row-actions">
                                    <button type="button" className="btn-ghost" disabled={loading} onClick={() => void toggleActive(p)}>
                                        {p.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button type="button" className="btn-danger" disabled={loading} onClick={() => void removePack(p.id)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
