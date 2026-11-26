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

## Компиляция

Tact ставится через npm. В CI добавим workflow `ton-compile.yml`:
```bash
npm install @tact-lang/compiler
npx tact --config ton/tact.config.json
```
Локально Node сейчас не установлен — компиляцию и тесты делаем в GitHub Actions.
