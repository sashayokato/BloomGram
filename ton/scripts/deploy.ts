// Testnet deploy. Mnemonic is read from DEPLOYER_MNEMONIC at runtime and never written to disk.
// Supports: TON mnemonic (12/24, V4) and BIP39 mnemonic + SLIP-0010 path (W5/V5R1).
import { Address, beginCell, toNano, contractAddress, SendMode } from '@ton/core';
import { TonClient, WalletContractV4, WalletContractV5R1, internal } from '@ton/ton';
import { mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { ShardWorld } from '../build/shard_world_ShardWorld';

const OWNER = process.env.DEPLOYER_ADDRESS ?? '';
const ENDPOINT = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';
const FORMAT = process.env.MNEMONIC_FORMAT ?? 'bip39';       // 'bip39' | 'ton'
const PATH = process.env.DERIVATION_PATH ?? "m/44'/607'/0'";
const WALLET = process.env.WALLET_TYPE ?? 'w5';               // 'w5' | 'v4'

async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (e: any) {
            if (i === tries - 1) throw e;
            const wait = 3000 * (i + 1);
            console.warn(`RPC error (${e?.message ?? e}), retry ${i + 1}/${tries} in ${wait / 1000}s...`);
            await new Promise((r) => setTimeout(r, wait));
        }
    }
    throw new Error('unreachable');
}

async function main() {
    const raw = process.env.DEPLOYER_MNEMONIC;
    if (!raw) throw new Error('Set DEPLOYER_MNEMONIC in your shell (never in chat or files).');
    const words = raw.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) throw new Error('Use 12 or 24 words');

    let publicKey: Buffer;
    let secretKey: Buffer;

    if (FORMAT === 'bip39') {
        if (!validateMnemonic(words.join(' '), wordlist)) {
            throw new Error('Not a valid BIP39 mnemonic');
        }
        const seed = mnemonicToSeedSync(words.join(' '));
        const { key } = derivePath(PATH, Buffer.from(seed).toString('hex'));
        const kp = nacl.sign.keyPair.fromSeed(new Uint8Array(key));
        publicKey = Buffer.from(kp.publicKey);
        secretKey = Buffer.from(kp.secretKey);
        console.log('mnemonic format: BIP39 | path:', PATH);
    } else {
        const valid = await mnemonicValidate(words);
        if (!valid && process.env.ALLOW_UNVALIDATED_MNEMONIC !== '1') {
            throw new Error('Not a valid TON mnemonic. Use TonKeeper phrase or set ALLOW_UNVALIDATED_MNEMONIC=1 (testnet only).');
        }
        const kp = await mnemonicToPrivateKey(words);
        publicKey = kp.publicKey;
        secretKey = kp.secretKey;
        console.log('mnemonic format: TON');
    }

    const wallet: any = WALLET === 'w5'
        ? WalletContractV5R1.create({ publicKey })
        : WalletContractV4.create({ workchain: 0, publicKey });

    const owner = wallet.address; // contract owner must be the wallet that signs
    if (OWNER && !owner.equals(Address.parse(OWNER))) {
        console.warn('WARNING: DEPLOYER_ADDRESS differs from derived wallet. Using derived wallet as owner.');
    }
    const state = await ShardWorld.init(owner);
    const contractAddr = contractAddress(0, state);

    console.log('wallet type:', WALLET);
    console.log('deployer wallet:', owner.toString());
    console.log('contract address:', contractAddr.toString());
    console.log('network:', ENDPOINT);

    const client = new TonClient({ endpoint: ENDPOINT });
    const openedWallet = client.open(wallet);
    const balanceNano = await withRetry(() => client.getBalance(owner));
    console.log('wallet balance:', Number(balanceNano) / 1e9, 'TON');
    if (balanceNano < toNano('0.2')) {
        throw new Error('Fund this wallet with testnet TON first, then rerun.');
    }

    const seqno = await withRetry(() => openedWallet.getSeqno());
    const transfer = internal({
        to: contractAddr,
        value: toNano('0.15'),
        init: state,
        body: beginCell().endCell(),
    });

    if (WALLET === 'w5') {
        await withRetry(() => openedWallet.sendTransfer({
            secretKey,
            seqno,
            messages: [transfer],
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            authType: 'external',
        }));
    } else {
        await withRetry(() => openedWallet.sendTransfer({
            secretKey,
            seqno,
            messages: [transfer],
        }));
    }
    console.log('deploy transaction sent. Check contract address in tonscan testnet.');
}

main().catch((e: any) => { console.error(e.message ?? e); process.exit(1); });
