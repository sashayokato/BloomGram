// Prints only validity, never the mnemonic itself.
import { mnemonicValidate } from '@ton/crypto';

async function main() {
    const raw = process.env.DEPLOYER_MNEMONIC;
    if (!raw) {
        console.log('Set DEPLOYER_MNEMONIC in your shell first.');
        process.exit(1);
    }
    const words = raw.trim().split(/\s+/);
    console.log('words:', words.length);
    console.log('valid TON mnemonic:', await mnemonicValidate(words));
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
