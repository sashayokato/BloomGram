// Find which wallet address a mnemonic controls: TON standard, BIP39+SLIP-0010, wallet versions.
// Usage: DEPLOYER_MNEMONIC="..." npx tsx scripts/compare_any.ts <address1> [address2 ...]
import { Address } from '@ton/core';
import { mnemonicValidate, mnemonicToPrivateKey } from '@ton/crypto';
import { validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import {
    WalletContractV1R1, WalletContractV1R2, WalletContractV1R3,
    WalletContractV2R1, WalletContractV2R2,
    WalletContractV3R1, WalletContractV3R2,
    WalletContractV4, WalletContractV5R1,
} from '@ton/ton';

const PATHS = [
    "m/44'/607'/0'",
    "m/44'/607'/0'/0/0",
    "m/44'/607'/0'/0'",
    "m/44'/607'/0'/0",
    "m/44'/607'/0'/0'/0'",
    "m/44'/607'/0'/0/1",
    "m/44'/607'/0'/1'/0/0",
    "m/44'/60'/0'/0/0",
    "m/44'/60'/0'/0'",
];

const WALLETS: Record<string, any> = {
    v1r1: WalletContractV1R1, v1r2: WalletContractV1R2, v1r3: WalletContractV1R3,
    v2r1: WalletContractV2R1, v2r2: WalletContractV2R2,
    v3r1: WalletContractV3R1, v3r2: WalletContractV3R2,
    v4r2: WalletContractV4, w5: WalletContractV5R1,
};

async function main() {
    const raw = process.env.DEPLOYER_MNEMONIC;
    if (!raw) throw new Error('Set DEPLOYER_MNEMONIC in your shell first.');
    const argvTargets = process.argv.slice(2);
    if (argvTargets.length === 0) throw new Error('Pass at least one TON address as argument.');

    const targets: Array<{ input: string; raw: string }> = [];
    for (const t of argvTargets) {
        try {
            targets.push({ input: t, raw: Address.parse(t).toRawString() });
            console.log('target', t, '-> raw', Address.parse(t).toRawString());
        } catch {
            console.log('target', t, '-> INVALID ADDRESS (skipped)');
        }
    }
    if (!targets.length) throw new Error('No valid target addresses');

    const words = raw.trim().split(/\s+/);
    const phrase = words.join(' ');
    const tonValid = await mnemonicValidate(words);
    const bipValid = validateMnemonic(phrase, wordlist);
    console.log('TON mnemonic valid:', tonValid, '| BIP39 valid:', bipValid);

    const keys: Array<{ name: string; publicKey: Buffer }> = [];
    if (tonValid) {
        const k = await mnemonicToPrivateKey(words);
        keys.push({ name: 'ton-mnemonic', publicKey: k.publicKey });
    }
    if (bipValid) {
        const seed = mnemonicToSeedSync(phrase);
        for (const path of PATHS) {
            try {
                const { key } = derivePath(path, Buffer.from(seed).toString('hex'));
                const kp = nacl.sign.keyPair.fromSeed(new Uint8Array(key));
                keys.push({ name: 'bip39 ' + path, publicKey: Buffer.from(kp.publicKey) });
            } catch { /* skip unsupported paths */ }
        }
        // direct ed25519 from BIP39 seed without derivation path
        const direct = nacl.sign.keyPair.fromSeed(new Uint8Array(seed.slice(0, 32)));
        keys.push({ name: 'bip39 direct', publicKey: Buffer.from(direct.publicKey) });
    }
    // TON seed derivation even when checksum fails (what deploy.ts does)
    try {
        const k = await mnemonicToPrivateKey(words);
        keys.push({ name: 'ton-derive-unvalidated', publicKey: k.publicKey });
    } catch { /* ignore */ }

    let found = 0;
    for (const key of keys) {
        for (const [name, T] of Object.entries(WALLETS)) {
            for (let walletId = 0; walletId <= 100; walletId++) {
                let address: Address;
                try {
                    address = T.create({
                        workchain: 0,
                        publicKey: key.publicKey,
                        ...(name === 'w5' ? {} : { walletId }),
                    }).address;
                } catch {
                    continue;
                }
                const rawAddr = address.toRawString();
                const hit = targets.find((t) => t.raw === rawAddr);
                if (hit) {
                    console.log('MATCH:', hit.input, '|', key.name, '|', name, '| walletId', walletId,
                        '| friendly', address.toString({ bounceable: true }),
                        '| nonbounce', address.toString({ bounceable: false }));
                    found++;
                }
                if (name !== 'w5') break; // walletId affects only some versions; keep loop for others
            }
        }
    }
    if (!found) console.log('NO MATCH across', keys.length, 'derivations x', Object.keys(WALLETS).length, 'wallet versions');
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
