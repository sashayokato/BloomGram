import { contractAddress } from '@ton/core';
import { WalletContractV5R1 } from '@ton/ton';
import { mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { ShardWorld } from '../build/shard_world_ShardWorld';

async function main() {
    const raw = process.env.DEPLOYER_MNEMONIC;
    if (!raw) throw new Error('set DEPLOYER_MNEMONIC');
    const words = raw.trim().split(/\s+/);
    const phrase = words.join(' ');
    if (!validate(phrase)) throw new Error('not BIP39');
    const seed = mnemonicToSeedSync(phrase);
    const { key } = derivePath("m/44'/607'/0'", Buffer.from(seed).toString('hex'));
    const kp = nacl.sign.keyPair.fromSeed(new Uint8Array(key));
    const wallet = WalletContractV5R1.create({ publicKey: Buffer.from(kp.publicKey) });
    const init = await ShardWorld.init(wallet.address);
    console.log('wallet  :', wallet.address.toString());
    console.log('contract:', contractAddress(0, init).toString());
}
function validate(p: string): boolean {
    // local check without extra import noise
    const words = p.split(' ');
    return words.length === 12 || words.length === 24;
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
