import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createHash } from 'crypto';
import { Address, beginCell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';
import {
    ShardWorld,
    storeBuyGift,
    storeBuyNumber,
    storeBuyUsername,
    storeUpgrade,
    storeGiftNft,
} from '../../ton/build/shard_world_ShardWorld';

const CONTRACT_ADDRESS = process.env.SHARD_CONTRACT_ADDRESS ?? '';
const ENDPOINT = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';
const PORT = Number(process.env.PORT ?? 8787);
const SHD = 1_000_000_000n;

if (!CONTRACT_ADDRESS) {
    console.error('Set SHARD_CONTRACT_ADDRESS (address of deployed ShardWorld contract).');
    process.exit(1);
}

const client = new TonClient({ endpoint: ENDPOINT });
const world = client.open(ShardWorld.fromAddress(Address.parse(CONTRACT_ADDRESS)));
const hash = (s: string) => BigInt('0x' + createHash('sha256').update(s).digest('hex'));

function json(res: ServerResponse, code: number, data: unknown) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

async function body(req: IncomingMessage): Promise<any> {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : {};
}

function unsignedBody(store: (builder: any) => void): string {
    return beginCell().store(store).endCell().toBoc().toString('base64');
}

async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';

    if (method === 'GET' && path === '/health') {
        return json(res, 200, { ok: true, contract: CONTRACT_ADDRESS, network: ENDPOINT });
    }

    if (method === 'GET' && path === '/catalog') {
        return json(res, 200, {
            currency: 'SHD',
            decimals: 9,
            prices: {
                gift: 1000,
                upgrade: 500,
                number: 5000,
                username: { 3: 10000, 4: 5000, 5: 2000, '6+': 500 },
            },
            usernameRules: { min: 3, max: 15, charset: 'a-z0-9', forbidden: ['admin', 'support', 'system', 'bloomgram'] },
        });
    }

    if (method === 'GET' && path.startsWith('/wallet/')) {
        const addr = Address.parse(path.slice('/wallet/'.length));
        const balance = await world.getBalance(addr);
        return json(res, 200, { address: addr.toString(), balanceShd: Number(balance / SHD) });
    }

    if (method === 'GET' && path.startsWith('/nft/')) {
        const id = BigInt(path.slice('/nft/'.length));
        const nft = await world.getNft(id);
        if (!nft) return json(res, 404, { error: 'nft not found' });
        return json(res, 200, {
            id: id.toString(),
            owner: nft.owner.toString(),
            kind: nft.kind.toString(),
            level: nft.level.toString(),
            label: nft.label,
            issuedAt: nft.issuedAt.toString(),
        });
    }

    if (method === 'POST' && path === '/registry/check') {
        const data = await body(req);
        if (data.number) return json(res, 200, { taken: await world.getNumberTaken(hash(data.number)) });
        if (data.username) return json(res, 200, { taken: await world.getUsernameTaken(hash(data.username)) });
        return json(res, 400, { error: 'number or username required' });
    }

    if (method === 'POST' && path === '/shop/buy') {
        const data = await body(req);
        let boc: string;
        if (data.kind === 'gift') boc = unsignedBody(storeBuyGift);
        else if (data.kind === 'number') boc = unsignedBody((b) => storeBuyNumber({ $$type: 'BuyNumber', number: String(data.payload) })(b));
        else if (data.kind === 'username') boc = unsignedBody((b) => storeBuyUsername({ $$type: 'BuyUsername', username: String(data.payload) })(b));
        else return json(res, 400, { error: 'unknown kind' });
        return json(res, 200, { to: CONTRACT_ADDRESS, value: '0.15', bodyBoc: boc, note: 'sign with your TON wallet' });
    }

    const upgrade = path.match(/^\/nft\/(\d+)\/upgrade$/);
    if (method === 'POST' && upgrade) {
        const boc = unsignedBody((b) => storeUpgrade({ $$type: 'Upgrade', id: BigInt(upgrade[1]) })(b));
        return json(res, 200, { to: CONTRACT_ADDRESS, value: '0.15', bodyBoc: boc });
    }

    const gift = path.match(/^\/nft\/(\d+)\/gift$/);
    if (method === 'POST' && gift) {
        const data = await body(req);
        const boc = unsignedBody((b) => storeGiftNft({ $$type: 'GiftNft', id: BigInt(gift[1]), to: Address.parse(data.to) })(b));
        return json(res, 200, { to: CONTRACT_ADDRESS, value: '0.15', bodyBoc: boc });
    }

    return json(res, 404, { error: 'not found' });
}

createServer((req, res) => {
    handle(req, res).catch((e) => json(res, 500, { error: e.message ?? String(e) }));
}).listen(PORT, () => console.log(`Shard backend on http://localhost:${PORT}`));
