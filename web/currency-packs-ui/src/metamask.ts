export type Eip1193Provider = {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    isMetaMask?: boolean;
};

function pickProvider(): Eip1193Provider | null {
    if (typeof window === 'undefined') return null;
    const w = window as Window & {
        ethereum?: Eip1193Provider & { providers?: Eip1193Provider[] };
    };
    const eth = w.ethereum;
    if (!eth) return null;
    const multi = eth.providers;
    if (Array.isArray(multi) && multi.length) {
        const mm = multi.find((p) => p.isMetaMask);
        return mm ?? multi[0] ?? null;
    }
    return eth;
}

function toHexChainId(chainIdDec: number): string {
    return `0x${BigInt(chainIdDec).toString(16)}`;
}

/**
 * Ensures the browser wallet is on `expectedChainId`, prompts account access, returns selected 0x address.
 */
export async function connectMetaMaskAndReadAddress(expectedChainId: number): Promise<string> {
    const eth = pickProvider();
    if (!eth) {
        throw new Error('No injected wallet found. Install MetaMask for Chrome and refresh this page.');
    }

    const targetHex = toHexChainId(expectedChainId);
    const current = (await eth.request({ method: 'eth_chainId' })) as string;
    if (current.toLowerCase() !== targetHex.toLowerCase()) {
        try {
            await eth.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetHex }],
            });
        } catch (e: unknown) {
            const code =
                typeof e === 'object' && e !== null && 'code' in e ? (e as { code: number }).code : undefined;
            if (code === 4902) {
                throw new Error(
                    `Chain ${expectedChainId} is not added in your wallet. Add this network in MetaMask, then try again.`,
                );
            }
            throw e instanceof Error ? e : new Error(String(e));
        }
    }

    const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
    const addr = accounts[0];
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        throw new Error('Wallet did not return a valid account.');
    }
    return addr;
}
