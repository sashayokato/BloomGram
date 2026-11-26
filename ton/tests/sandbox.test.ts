import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, toNano } from '@ton/core';
import { createHash } from 'crypto';
import { ShardWorld } from '../build/shard_world_ShardWorld';

const SHD = 1_000_000_000n;
const ok = (cond: boolean, label: string) => {
    if (!cond) throw new Error('FAIL: ' + label);
    console.log('OK  ' + label);
};
const hash = (s: string) => BigInt('0x' + createHash('sha256').update(s).digest('hex'));

async function main() {
    const blockchain = await Blockchain.create();
    const deployer = await blockchain.treasury('deployer');
    const user = await blockchain.treasury('user');
    const friend = await blockchain.treasury('friend');

    const world = blockchain.openContract(await ShardWorld.fromInit(deployer.address));

    // Deploy + first gift (owner buys one gift for itself)
    await world.send(deployer as any, { value: toNano('0.2') }, { $$type: 'BuyGift' });
    ok((await world.getTotalSupply()) === 1_000_000_000n * SHD, 'fixed supply = 1B SHD');
    ok((await world.getBalance(deployer.address)) === 1_000_000_000n * SHD, 'owner holds entire supply');

    // Distribute 100 000 SHD to the user
    await world.send(deployer as any, { value: toNano('0.2') }, {
        $$type: 'TransferShd', to: user.address, amount: 100_000n * SHD,
    });
    ok((await world.getBalance(user.address)) === 100_000n * SHD, 'user received SHD');

    // User buys a regular gift: 1000 SHD
    await world.send(user as any, { value: toNano('0.2') }, { $$type: 'BuyGift' });
    ok((await world.getBalance(user.address)) === 99_000n * SHD, 'gift costs 1000 SHD');
    ok((await world.getNft(2n))?.owner.equals(user.address) === true, 'gift NFT belongs to user');

    // +999 number: 5000 SHD, unique
    const number = '+9991234567';
    await world.send(user as any, { value: toNano('0.2') }, { $$type: 'BuyNumber', number });
    ok(await world.getNumberTaken(hash(number)) === true, '+999 number registered');
    ok((await world.getBalance(user.address)) === 94_000n * SHD, 'number costs 5000 SHD');

    // Username of length 3: 10 000 SHD
    const name = 'abc';
    await world.send(user as any, { value: toNano('0.2') }, { $$type: 'BuyUsername', username: name });
    ok(await world.getUsernameTaken(hash(name)) === true, 'username registered');
    ok((await world.getBalance(user.address)) === 84_000n * SHD, '3-char username costs 10000 SHD');

    // Upgrade NFT #2: 500 SHD
    await world.send(user as any, { value: toNano('0.2') }, { $$type: 'Upgrade', id: 2n });
    ok((await world.getNft(2n))?.level === 2n, 'upgrade raises level');
    ok((await world.getBalance(user.address)) === 83_500n * SHD, 'upgrade costs 500 SHD');

    // Gift NFT #2 to friend
    await world.send(user as any, { value: toNano('0.2') }, { $$type: 'GiftNft', id: 2n, to: friend.address });
    ok((await world.getNft(2n))?.owner.equals(friend.address) === true, 'NFT gifted to friend');

    console.log('ALL SANDBOX TESTS PASSED');
}

main().catch((e) => { console.error(e); process.exit(1); });
