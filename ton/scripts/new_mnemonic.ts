// Generates a fresh TON mnemonic locally. Output goes to YOUR console only.
// Never paste the printed words into chat, files or GitHub.
import { mnemonicNew } from '@ton/crypto';

async function main() {
    const count = Number(process.argv[2] ?? 12);
    if (count !== 12 && count !== 24) throw new Error('Use 12 or 24');
    console.log('Write these words down offline, then NEVER share them:');
    console.log((await mnemonicNew(count)).join(' '));
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
