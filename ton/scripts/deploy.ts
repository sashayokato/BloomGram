// Testnet deploy. The mnemonic is read from DEPLOYER_MNEMONIC at runtime
// and is never written to a file, log, or repository.
import { Address, beginCell, toNano, contractAddress } from '@ton/core';
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { ShardWorld } from '../build/shard_world_ShardWorld';

const OWNER = process.env.DEPLOYER_ADDRESS ?? '0QB17-KDx0flM7ZPflsOW-U4Kj4HPtVjbCNPcDeOCJytPh8q';
const ENDPOINT = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';

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
    if (!raw) {
        throw new Error('Set DEPLOYER_MNEMONIC in your shell (12 or 24 words). Never paste it into chat or files.');
    }
    const words = raw.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
        throw new Error('DEPLOYER_MNEMONIC must contain 12 or 24 words, got ' + words.length);
    }
    const valid = await mnemonicValidate(words);
    if (!valid && process.env.ALLOW_UNVALIDATED_MNEMONIC !== '1') {
        throw new Error('Mnemonic is not a valid TON mnemonic (checksum failed). Use a TonKeeper phrase, or set ALLOW_UNVALIDATED_MNEMONIC=1 for TESTNET ONLY.');
    }
    if (!valid) {
        console.warn('WARNING: mnemonic is not a standard TON phrase. Derived wallet will be used as owner. TESTNET ONLY.');
    }

    const keyPair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const owner = wallet.address; // contract owner must be the wallet that actually signs
    const requested = Address.parse(OWNER);
    if (!owner.equals(requested)) {
        console.warn('WARNING: DEPLOYER_ADDRESS differs from derived wallet. Using derived wallet:', owner.toString());
    }
    const state = await ShardWorld.init(owner);
    const contractAddr = contractAddress(0, state);

    console.log('deployer wallet:', wallet.address.toString());
    console.log('contract address:', contractAddr.toString());
    console.log('network:', ENDPOINT);

    const client = new TonClient({ endpoint: ENDPOINT });
    const openedWallet = client.open(wallet);
    const balanceNano = await withRetry(() => client.getBalance(wallet.address));
    console.log('wallet balance:', Number(balanceNano) / 1e9, 'TON');
    if (balanceNano < toNano('0.2')) {
        throw new Error('Fund the derived wallet with testnet TON first (faucet), then rerun.');
    }

    const seqno = await withRetry(() => openedWallet.getSeqno());
    const transfer = internal({
        to: contractAddr,
        value: toNano('0.15'),
        init: state,
        body: beginCell().endCell(),
    });
    await withRetry(() => openedWallet.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [transfer],
    }));
    console.log('deploy transaction sent. Wait ~10s, then check the contract address in tonscan testnet.');
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
