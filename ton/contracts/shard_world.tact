// BloomGram Shard (SHD) on-chain world.
// Fixed supply: 1 000 000 000 SHD, 9 decimals, all assigned to the owner at deploy.
// No owner minting afterwards. Purchases and upgrades pay the deployer (project treasury).

import "@stdlib/ownable";

const SHD_DECIMALS: Int = 1_000_000_000;
const PRICE_GIFT: Int = 1000;
const PRICE_UPGRADE: Int = 500;
const PRICE_NUMBER: Int = 5000;
const PRICE_SHORT_3: Int = 10000;
const PRICE_SHORT_4: Int = 5000;
const PRICE_SHORT_5: Int = 2000;
const PRICE_LONG: Int = 500;

const KIND_GIFT: Int = 0;
const KIND_NUMBER: Int = 1;
const KIND_USERNAME: Int = 2;

struct Nft {
    owner: Address;
    kind: Int;
    level: Int;
    keyHash: Int;
    label: String;
    issuedAt: Int;
}

message(0x73684401) BuyGift { }
message(0x73684402) BuyNumber { number: String; }
message(0x73684403) BuyUsername { username: String; }
message(0x73684404) Upgrade { id: Int; }
message(0x73684405) GiftNft { id: Int; to: Address; }
message(0x73684406) TransferShd { to: Address; amount: Int; }

contract ShardWorld with Ownable {
    owner: Address;
    totalSupply: Int;
    balances: map<Address, Int>;
    nfts: map<Int, Nft>;
    numberOwners: map<Int, Int>;
    usernameOwners: map<Int, Int>;
    nextId: Int;

    init(owner: Address) {
        self.owner = owner;
        self.totalSupply = 1_000_000_000 * SHD_DECIMALS;
        self.balances.set(owner, self.totalSupply);
        self.nextId = 1;
    }

    fun balanceOf(addr: Address): Int {
        let value = self.balances.get(addr);
        if (value == null) { return 0; }
        return value!!;
    }

    fun pay(sender: Address, priceBase: Int) {
        let balance = self.balanceOf(sender);
        throwUnless(401, balance >= priceBase);
        self.balances.set(sender, balance - priceBase);
        self.balances.set(self.owner, self.balanceOf(self.owner) + priceBase);
    }

    fun mint(kind: Int, keyHash: Int, label: String, price: Int) {
        let buyer = sender();
        self.pay(buyer, price * SHD_DECIMALS);
        let id = self.nextId;
        self.nextId = id + 1;
        let nft = Nft {
            owner: buyer,
            kind: kind,
            level: 1,
            keyHash: keyHash,
            label: label,
            issuedAt: now(),
        };
        self.nfts.set(id, nft);
    }

    fun stringLen(s: String): Int {
        return s.asSlice().bits() / 8;
    }

    fun priceForUsername(name: String): Int {
        let len = self.stringLen(name);
        if (len == 3) { return PRICE_SHORT_3; }
        if (len == 4) { return PRICE_SHORT_4; }
        if (len == 5) { return PRICE_SHORT_5; }
        return PRICE_LONG;
    }

    receive(msg: BuyGift) {
        self.mint(KIND_GIFT, 0, "", PRICE_GIFT);
    }

    receive(msg: BuyNumber) {
        let number = msg.number;
        throwUnless(402, self.stringLen(number) >= 10);
        let h = sha256(number);
        throwUnless(403, self.numberOwners.get(h) == null);
        self.mint(KIND_NUMBER, h, number, PRICE_NUMBER);
        self.numberOwners.set(h, self.nextId - 1);
    }

    receive(msg: BuyUsername) {
        let name = msg.username;
        throwUnless(404, self.stringLen(name) >= 3 && self.stringLen(name) <= 15);
        throwUnless(405, name != "admin" && name != "support" && name != "system" && name != "bloomgram");
        let h = sha256(name);
        throwUnless(406, self.usernameOwners.get(h) == null);
        self.mint(KIND_USERNAME, h, name, self.priceForUsername(name));
        self.usernameOwners.set(h, self.nextId - 1);
    }

    receive(msg: Upgrade) {
        let maybeNft = self.nfts.get(msg.id);
        throwUnless(407, maybeNft != null);
        let nft = maybeNft!!;
        throwUnless(408, nft.owner == sender());
        self.pay(sender(), PRICE_UPGRADE * SHD_DECIMALS);
        nft.level = nft.level + 1;
        self.nfts.set(msg.id, nft);
    }

    receive(msg: GiftNft) {
        let maybeNft = self.nfts.get(msg.id);
        throwUnless(409, maybeNft != null);
        let nft = maybeNft!!;
        throwUnless(410, nft.owner == sender());
        nft.owner = msg.to;
        self.nfts.set(msg.id, nft);
    }

    receive(msg: TransferShd) {
        let amount = msg.amount;
        throwUnless(411, amount > 0);
        let from = sender();
        let fromBalance = self.balanceOf(from);
        throwUnless(412, fromBalance >= amount);
        self.balances.set(from, fromBalance - amount);
        self.balances.set(msg.to, self.balanceOf(msg.to) + amount);
    }

    get fun balance(addr: Address): Int {
        return self.balanceOf(addr);
    }

    get fun totalSupply(): Int {
        return self.totalSupply;
    }

    get fun nft(id: Int): Nft? {
        return self.nfts.get(id);
    }

    get fun numberTaken(hash: Int): Bool {
        return self.numberOwners.get(hash) != null;
    }

    get fun usernameTaken(hash: Int): Bool {
        return self.usernameOwners.get(hash) != null;
    }
}
