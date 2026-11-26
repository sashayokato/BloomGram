# TON-контракты Shard (SHD)

Здесь будут лежать контракты. Пока зафиксирован интерфейс — код пишется после решения
по эмиссии и ценам (см. `BLOOMGRAM-NFT-АРХИТЕКТУРА.md`, раздел 4).

## Файлы (планируемые)

| Файл | Назначение |
|---|---|
| `contracts/shard_jetton.tact` | Jetton-минтер SHD (TEP-74) |
| `contracts/shard_wallet.tact` | Jetton-кошелёк пользователя |
| `contracts/nft_collection.tact` | Коллекция Shard Collectibles |
| `contracts/nft_item.tact` | NFT-предмет с level/kind/number/username |
| `contracts/registry.tact` | Уникальность `+999…` и юзернеймов |
| `contracts/shop.tact` | Покупка и апгрейд за SHD |
| `tact.config.json` | Конфиг компиляции |
| `tests/` | Тесты покупки/апгрейда/подарка в testnet |

## Get-методы (контракт → клиент)

### Jetton minter
- `get_jetton_data()` → `total_supply`, `owner`, `content`, `wallet_code`
- `get_wallet_address(owner: slice)` → `slice`

### NFT item
- `get_nft_data()` → `init?`, `index`, `collection`, `owner`, `content`
- `get_shard_data()` → `kind:int`, `level:int`, `number:slice?`, `username:slice?`, `issuedAt:int`

### Registry
- `is_number_taken(number: slice)` → `bool`
- `is_username_taken(username: slice)` → `bool`
- `resolve_number(number: slice)` → `address?`
- `resolve_username(username: slice)` → `address?`

## Инварианты

1. Один `+999…` номер → не более одного NFT.
2. Один юзернейм (регистронезависимо) → не более одного NFT.
3. Апгрейд увеличивает level только после списания SHD.
4. Подарок — обычный transfer NFT item; реестр уникальности не меняется.
5. Owner коллекции может выпускать подарки, но не может подделать владение.

## Компиляция и тесты

```bash
cd ton
npm ci
npx tact --config tact.config.json   # compile
npm test                             # 12 sandbox-тестов
```

Все тесты проходят локально и в CI (`ton-compile.yml`).

## Деплой в TON testnet

`scripts/deploy.ts` читает сид-фразу **только из env** `DEPLOYER_MNEMONIC`
и не пишет её в файлы. Поддерживаются TON-фразы из **12 или 24 слов**.

```powershell
$env:DEPLOYER_MNEMONIC="..."   # только в твоей консоли
cd ton
npx tsx scripts/deploy.ts
```

По умолчанию используется **BIP39 + SLIP-0010 `m/44'/607'/0'` + W5 (V5R1)** —
именно эта комбинация управляет адресом `UQBL…`. Переопределить можно через
`MNEMONIC_FORMAT=ton`, `DERIVATION_PATH=...`, `WALLET_TYPE=v4`.

Адрес контракта computes из адреса кошелька: `npx tsx scripts/address_only.ts`.

Если фраза прошла по словам, но не по контрольной сумме TON (например, BIP39 от Ethereum),
для **тестнета** можно разрешить деплой:
```powershell
$env:ALLOW_UNVALIDATED_MNEMONIC="1"
```
Скрипт предупредит и использует адрес кошелька, который реально выводится из фразы,
как владельца контракта. `DEPLOYER_ADDRESS` в этом случае не используется как владелец —
нужно пополнить именно выведенный адрес тестовыми TON.

Проверить/создать фразу локально, **не показывая её в чате**:
```bash
npx tsx scripts/check_mnemonic.ts          # выведет только words: N / valid: true|false
npx tsx scripts/new_mnemonic.ts 12         # создаст новую фразу в твоём терминале
```
Скрипт выведет адрес контракта — проверь его в tonscan testnet.
