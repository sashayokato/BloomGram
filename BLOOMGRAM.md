# BloomGram

Telegram client based on [exteraGram](https://github.com/exteraSquad/exteraGram) (GPLv3+, see ADDITIONAL_TERMS.md).
Developer: @vlodt - channel: @bloomgrams

## Build
1. `API_KEYS` (git-ignored) holds APP_ID / APP_HASH / MAPS_V2_API.
2. Replace `TMessagesProj/google-services.json` with your own Firebase file for `com.bloomgram.messenger` (needed for push).
3. Open `BloomBadges.kt` and set `CREATOR_ID` to your numeric Telegram id (until then the creator is matched by username @vlodt).
4. Build in Android Studio / `./gradlew assembleArm64Release`.
   Do NOT run `generateAppIcons`: it regenerates res-appicons and overwrites the BloomGram icon.

## Badges
- Creator badge: bound to `CREATOR_ID` (currently 5853805443, @vlodt).
- Four grantable badges: **Developer**, **VIP**, **Admin**, **Media partner**.
  On the creator account open any user's profile -> menu -> "Grant/revoke ... badge".
- To make grants visible to all BloomGram users, set `GRANTS_URL` to a raw JSON file:
  ```json
  {"developers":[123],"admins":[456],"vip":[789],"media":[101]}
  ```
  `BloomBadges.exportGrantsJson()` produces this file from local grants.
- Badges are client-side only: other Telegram clients do not see them.

## Not implemented (needs your own server)
Private-only gifts and virtual numbers cannot be added in a client: they live on Telegram's servers.
