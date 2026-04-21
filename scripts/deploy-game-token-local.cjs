/**
 * Deploy GameToken.sol to a local JSON-RPC (e.g. Anvil on 127.0.0.1:8545).
 * Uses solc-js + ethers (no Foundry required on PATH).
 *
 * Usage (from repo root):
 *   node scripts/deploy-game-token-local.cjs
 *
 * Env:
 *   RPC_URL — default http://127.0.0.1:8545
 *   WALLET_PRIVATE_KEY — default Anvil account #0 (public test key)
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

const GAME_TOKEN_DIR = path.join(path.resolve(__dirname, '..'), 'game-token');
const SOURCE_PATH = 'src/GameToken.sol';

function readSource(relFromGameToken) {
    return fs.readFileSync(path.join(GAME_TOKEN_DIR, relFromGameToken), 'utf8');
}

function findImports(importPath, parentPath) {
    const resolveUnderLibOz = (suffix) => {
        const full = path.join(GAME_TOKEN_DIR, 'lib', 'openzeppelin-contracts', suffix);
        if (fs.existsSync(full)) return { contents: fs.readFileSync(full, 'utf8') };
        return { error: `File not found: ${suffix}` };
    };

    if (importPath.startsWith('openzeppelin-contracts/')) {
        const suffix = importPath.slice('openzeppelin-contracts/'.length);
        return resolveUnderLibOz(suffix);
    }

    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const baseDir = path.dirname(path.join(GAME_TOKEN_DIR, parentPath || SOURCE_PATH));
        const resolved = path.normalize(path.join(baseDir, importPath));
        const prefix = path.join(GAME_TOKEN_DIR, '') + path.sep;
        if (!resolved.startsWith(prefix)) {
            return { error: 'Invalid import path' };
        }
        const rel = path.relative(GAME_TOKEN_DIR, resolved);
        if (fs.existsSync(resolved)) return { contents: fs.readFileSync(resolved, 'utf8') };
        return { error: `File not found: ${rel}` };
    }

    return { error: `Unsupported import: ${importPath} (parent: ${parentPath})` };
}

function compile() {
    const input = {
        language: 'Solidity',
        sources: {
            [SOURCE_PATH]: { content: readSource(SOURCE_PATH) },
        },
        settings: {
            optimizer: { enabled: true, runs: 200 },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode.object'],
                },
            },
        },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    if (output.errors) {
        const fatal = output.errors.filter((e) => e.severity === 'error');
        if (fatal.length) {
            console.error(fatal.map((e) => e.formattedMessage).join('\n'));
            throw new Error('Solidity compile failed');
        }
    }

    const contract = output.contracts[SOURCE_PATH].GameToken;
    if (!contract?.evm?.bytecode?.object) {
        throw new Error('No bytecode for GameToken');
    }
    const bytecode = '0x' + contract.evm.bytecode.object;
    return { abi: contract.abi, bytecode };
}

async function main() {
    const rpc =
        process.env.RPC_URL?.trim() ||
        process.env.ANVIL_RPC_URL?.trim() ||
        'http://127.0.0.1:8545';
    const pk =
        process.env.WALLET_PRIVATE_KEY?.trim() ||
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    const { abi, bytecode } = compile();
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(pk, provider);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log(`Deploying GameToken via ${rpc} from ${wallet.address} ...`);
    const contract = await factory.deploy();
    await contract.deployTransaction.wait();
    const addr = contract.address;

    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log('');
    console.log('Deployed GameToken');
    console.log('  address:', addr);
    console.log('  name:', name, 'symbol:', symbol);
    console.log('');
    console.log('Add to .env:');
    console.log(`GAME_TOKEN_CONTRACT_ADDRESS=${addr}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
