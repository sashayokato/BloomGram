// Proper validation of TON and BIP39 mnemonics. Prints only public addresses, never the phrase.
import { mnemonicValidate, mnemonicToPrivateKey } from '@ton/crypto';
import { validateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { WalletContractV4 } from '@ton/ton';

const PATHS = [
    "m/44'/607'/0'",
    "m/44'/607'/0'/0/0",
    "m/44'/607'/0'/0'",
    "m/44'/607'/0'/0",
    "m/44'/607'/0'/0'/0'",
    "m/44'/607'/0'/1'/0/0",
    "m/44'/60'/0'/0/0",
];

async function main() {
    const raw = process.env.DEPLOYER_MNEMONIC;
    if (!raw) throw new Error('Set DEPLOYER_MNEMONIC in your shell first.');
    const words = raw.trim().split(/\s+/);
    const phrase = words.join(' ');

    const tonValid = await mnemonicValidate(words);
    const bipValid = validateMnemonic(phrase, wordlist);
    console.log('words:', words.length);
    console.log('valid TON mnemonic  :', tonValid);
    console.log('valid BIP39 mnemonic:', bipValid);

    if (tonValid) {
        const k = await mnemonicToPrivateKey(words);
        console.log('TON wallet V4:', WalletContractV4.create({ workchain: 0, publicKey: k.publicKey }).address.toString());
    } else {
        console.log('TON validation failed: this is not a standard TON mnemonic (checksum/wordlist).');
    }

    if (bipValid) {
        const seed = mnemonicToSeedSync(phrase);
        console.log('BIP39-derived TON V4 addresses:');
        for (const path of PATHS) {
            try {
                const { key } = derivePath(path, Buffer.from(seed).toString('hex'));
                const kp = nacl.sign.keyPair.fromSeed(new Uint8Array(key));
                const addr = WalletContractV4.create({ workchain: 0, publicKey: Buffer.from(kp.publicKey) }).address;
                console.log(' ', path, addr.toString(), '| raw', addr.toRawString());
            } catch (e: any) {
                console.log(' ', path, 'ERR', (e.message ?? String(e)).slice(0, 60));
            }
        }
    } else {
        console.log('BIP39 validation failed: words do not pass the BIP39 checksum.');
    }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
