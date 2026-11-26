# Backend-индексер Shard / BloomGram NFT

Назначение: кешировать состояние TON-контрактов и отдавать клиенту удобный API,
а также собирать **unsigned BOC** для подписи на устройстве пользователя.

## Стек (предложение)
- Node.js + TypeScript (или Python — решим при реализации).
- Postgres: таблицы `nfts`, `owners`, `gifts`, `usernames`, `numbers`, `tx_cache`.
- TON API: `tonapi.io` или `toncenter.com` с ключом.

## Endpoints

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/health` | Проверка живости |
| GET | `/catalog?kind=&page=` | Каталог NFT и цены |
| GET | `/wallet/:address` | Баланс SHD и список NFT |
| GET | `/nft/:id` | Карточка NFT, уровень, история |
| POST | `/shop/buy` | Unsigned BOC на покупку |
| POST | `/nft/:id/upgrade` | Unsigned BOC на апгрейд |
| POST | `/nft/:id/gift` | Unsigned BOC на подарок |
| POST | `/registry/check` | Проверка `+999`/юзернейма |
| GET | `/events?cursor=` | Лента подарков и покупок |

## Правила

- Сервер **не хранит приватные ключи** и не подписывает за пользователя.
- BOC собирается для конкретного `wallet address`, livedata проверяется перед отправкой.
- Все цены и правила берутся из контракта/конфига, а не из клиента.
- Клиентский UI обновляется только после подтверждения транзакции в сети.

## Секреты (GitHub / окружение)
- `TON_API_KEY`
- `DATABASE_URL`
- `SHD_MINTER_ADDRESS`, `NFT_COLLECTION_ADDRESS`, `REGISTRY_ADDRESS`, `SHOP_ADDRESS`
- `OWNER_TON_ADDRESS` (публичный адрес владельца)

Сид-фраза здесь не хранится и never не передаётся в API.
