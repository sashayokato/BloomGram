# BloomGram — приватная сборка на базе exteraGram v13.2.2

Это **не AyuGram**: исходники AyuGram 13.1.1 (сборка 20261104) приватны, поэтому
база — публичный исходник **exteraGram v13.2.2** (тег `v13.2.2`, 24.11.2026).
Свои: package `com.bloomgram.messenger`, имя `BloomGram`, подпись, Firebase и Telegram API.

## 1. Репозиторий

1. Создай **приватный** репозиторий на GitHub (например `bloomgram`).
2. Скопируй содержимое этого проекта в репозиторий и запушь:
   ```powershell
   git init
   git remote add origin https://github.com/<твой-логин>/bloomgram.git
   git add -A
   git commit -m "BloomGram initial import"
   git push -u origin main
   ```
3. Убедись, что `API_KEYS`, `*.jks` и `google-services.json` **не** попали в коммит
   (в `.gitignore` они есть; `google-services.json` в репозитории исходно присутствует —
   на сборку он перезаписывается из секрета).

## 2. Секреты (Settings → Secrets and variables → Actions → New repository secret)

| Имя | Что положить |
|---|---|
| `TELEGRAM_APP_ID` | Свой API ID с https://my.telegram.org/apps (цифры) |
| `TELEGRAM_APP_HASH` | Свой API Hash оттуда же (без кавычек — кавычки добавит воркфлоу) |
| `MAPS_V2_API` | Ключ Google Maps SDK (можно пустой, если карты не нужны) |
| `GOOGLE_SERVICES_JSON` | base64 своего `google-services.json` |
| `KEYSTORE_BASE64` | base64 keystore (см. шаг 3) |
| `KEYSTORE_PASSWORD` | Пароль хранилища |
| `KEY_ALIAS` | Алиас ключа (`bloomgram`) |
| `KEY_PASSWORD` | Пароль ключа |

Base64 на PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))
```

### Firebase

1. https://console.firebase.google.com → создать проект.
2. Add app → Android, package **`com.bloomgram.messenger`**.
3. Скачать `google-services.json`, закодировать в base64, положить в секрет.
4. Включить Cloud Messaging. Crashlytics/Analytics можно отключить в консоли Firebase.

## 3. Ключ подписи

Запусти вручную workflow **«Generate signing key (run once)»** (Actions → для него → Run workflow).
В артефакте `keystore-bundle-DELETE-AFTER-SAVING` будет `keystore-bundle.txt` с четырьмя
значениями. Разнеси их по секретам `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`,
`KEY_PASSWORD`, затем **удали артефакт**. Ключ больше нигде не хранится — сохрани копию
в безопасном месте: потеря ключа = невозможно обновить приложение под тем же package.

## 4. Сборка

Actions → **Build BloomGram** → Run workflow. Выбери вариант:

- `fullAfatRelease` — полная версия, универсальная (armv7 + arm64), как «full» у AyuGram;
- `liteAfatRelease` — лёгкая версия без hook-слоя.

После завершения скачай артефакт `bloomgram-<вариант>` → APK внутри.

Первая сборка тяжёлая: NDK 29 + нативный код Telegram, обычно 30–90 минут.
Если сборка упала — открой лог stepping `Build APK` и пришли сюда последние ~100 строк.

## 5. Что нужно знать

- Проект наследует GPL-v2/v3 лицензии upstream; при публикации кода нужны атрибуция.
- AyuGram-фичи (ghost mode, история удалённых сообщений) **отсутствуют**: их исходники
  приватны, перенести их можно только вручную из декомпилированного APK.
- Обновление upstream: `git remote add upstream https://github.com/exteraSquad/exteraGram.git`
  иmerge нужных тегов; собственные правки лучше держать отдельным коммитом.
