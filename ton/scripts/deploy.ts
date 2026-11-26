// Testnet deploy. The mnemonic is read from DEPLOYER_MNEMONIC at runtime
// and is never written to a file, log, or repository.
import { Address, beginCell, toNano, contractAddress } from '@ton/core';
import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey, mnemonicValidate } from '@ton/crypto';
import { ShardWorld } from '../build/shard_world_ShardWorld';

const OWNER = process.env.DEPLOYER_ADDRESS ?? '0QB17-KDx0flM7ZPflsOW-U4Kj4HPtVjbCNPcDeOCJytPh8q';
const ENDPOINT = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';

async function main() {
    const raw = process.env.DEPLOYER_MNEMONIC;
    if (!raw) {
        throw new Error('Set DEPLOYER_MNEMONIC in your shell (12 or 24 words). Never paste it into chat or files.');
    }
    const words = raw.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
        throw new Error('DEPLOYER_MNEMONIC must contain 12 or 24 words, got ' + words.length);
    }
    if (!(await mnemonicValidate(words))) {
        throw new Error('Mnemonic is not a valid TON mnemonic. Words must come from a TON wallet (TonKeeper etc.), not a BIP39/Ethereum phrase.');
    }

    const owner = Address.parse(OWNER);
    const keyPair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const state = await ShardWorld.init(owner);
    const contractAddr = contractAddress(0, state);

    console.log('deployer wallet:', wallet.address.toString());
    console.log('contract address:', contractAddr.toString());
    console.log('network:', ENDPOINT);

    const client = new TonClient({ endpoint: ENDPOINT });
    const openedWallet = client.open(wallet);
    const seqno = await openedWallet.getSeqno();

    const transfer = internal({
        to: contractAddr,
        value: toNano('0.15'),
        init: state,
        body: beginCell().endCell(),
    });
    await openedWallet.sendTransfer({
        secretKey: keyPair.secretKey,
        seqno,
        messages: [transfer],
    });
    console.log('deploy transaction sent. Wait ~10s, then check the contract address in tonscan testnet.');
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
