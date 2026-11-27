package com.exteragram.messenger.badges

import android.content.Context
import android.content.SharedPreferences
import com.exteragram.messenger.api.dto.BadgeDTO
import org.telegram.messenger.ApplicationLoader
import org.telegram.messenger.FileLog
import org.telegram.messenger.UserConfig
import org.telegram.messenger.UserObject
import org.telegram.tgnet.TLRPC
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * BloomGram badge layer.
 *
 * - Creator badge is hard-bound to [CREATOR_ID].
 * - Four badges can be granted/revoked by the creator from any user profile:
 *   [BadgeType.DEV], [BadgeType.VIP], [BadgeType.ADMIN], [BadgeType.MEDIA].
 * - Grants are stored locally and, if [GRANTS_URL] is set, merged with a remote
 *   JSON file so every BloomGram client sees the same badges.
 *
 * Badges are rendered client-side only: other Telegram clients never see them.
 */
object BloomBadges {

    enum class BadgeType(val key: String, val jsonKey: String) {
        DEV("dev", "developers"),
        VIP("vip", "vip"),
        ADMIN("admin", "admins"),
        MEDIA("media", "media")
    }

    /** Numeric Telegram user id of @vlodt. */
    const val CREATOR_ID = 5853805443L
    const val CREATOR_USERNAME = "vlodt"

    /** Optional raw JSON shared by all BloomGram clients. */
    val GRANTS_URL: String
        get() = ApplicationLoader.applicationContext.getString(org.telegram.messenger.R.string.GrantsUrl)

    /** Custom-emoji document ids (reused from BloomGram's own badge set). */
    private const val CREATOR_EMOJI_ID = 5359407509327085568L

    private const val PREFS = "bloomgram_badges"
    private const val KEY_REMOTE_PREFIX = "bloom_remote_"
    private const val KEY_LOCAL_PREFIX = "bloom_local_"
    private const val REFRESH_MS = 10 * 60 * 1000L

    val CREATOR_BADGE = BadgeDTO(CREATOR_EMOJI_ID, "{name} is the creator of BloomGram.")
    val DEV_BADGE = BadgeDTO(BadgesController.DEV_BADGE.documentId, "{name} is a member of the BloomGram development team.")
    val VIP_BADGE = BadgeDTO(BadgesController.SUPPORTER_BADGE.documentId, "{name} is a VIP user of BloomGram.")
    val ADMIN_BADGE = BadgeDTO(BadgesController.TRUSTED_BADGE.documentId, "{name} is an administrator of BloomGram.")
    val MEDIA_BADGE = BadgeDTO(BadgesController.DEV_BADGE.documentId, "{name} is a media partner of BloomGram.")

    private val prefs: SharedPreferences
        get() = ApplicationLoader.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    @Volatile private var lastFetch = 0L

    fun isCreator(id: Long): Boolean = CREATOR_ID != 0L && id == CREATOR_ID

    /** Id is authoritative; username is a fallback until CREATOR_ID is set. */
    fun isCurrentUserCreator(): Boolean {
        val user = UserConfig.getInstance(UserConfig.selectedAccount).currentUser ?: return false
        if (CREATOR_ID != 0L) return user.id == CREATOR_ID
        return UserObject.getPublicUsername(user).equals(CREATOR_USERNAME, ignoreCase = true)
    }

    private fun key(type: BadgeType, remote: Boolean): String =
        (if (remote) KEY_REMOTE_PREFIX else KEY_LOCAL_PREFIX) + type.key

    fun isGranted(type: BadgeType, id: Long): Boolean {
        val key = id.toString()
        return prefs.getStringSet(key(type, false), emptySet())!!.contains(key) ||
            prefs.getStringSet(key(type, true), emptySet())!!.contains(key)
    }

    fun isGrantedDeveloper(id: Long): Boolean = isGranted(BadgeType.DEV, id)

    fun isDev(id: Long): Boolean = isCreator(id) || isGrantedDeveloper(id)

    fun badgeFor(id: Long): BadgeDTO? = when {
        isCreator(id) -> CREATOR_BADGE
        isGranted(BadgeType.ADMIN, id) -> ADMIN_BADGE
        isGranted(BadgeType.DEV, id) -> DEV_BADGE
        isGranted(BadgeType.VIP, id) -> VIP_BADGE
        isGranted(BadgeType.MEDIA, id) -> MEDIA_BADGE
        else -> null
    }

    /** Creator only. */
    fun grant(type: BadgeType, id: Long): Boolean {
        if (!isCurrentUserCreator()) return false
        val set = HashSet(prefs.getStringSet(key(type, false), emptySet())!!)
        set.add(id.toString())
        prefs.edit().putStringSet(key(type, false), set).apply()
        return true
    }

    /** Creator only. */
    fun revoke(type: BadgeType, id: Long): Boolean {
        if (!isCurrentUserCreator()) return false
        val set = HashSet(prefs.getStringSet(key(type, false), emptySet())!!)
        set.remove(id.toString())
        prefs.edit().putStringSet(key(type, false), set).apply()
        return true
    }

    /** Backwards-compatible developer helpers. */
    fun grant(id: Long): Boolean = grant(BadgeType.DEV, id)
    fun revoke(id: Long): Boolean = revoke(BadgeType.DEV, id)

    /** Local grants as JSON to paste into the file behind [GRANTS_URL]. */
    fun exportGrantsJson(): String {
        fun array(type: BadgeType) = prefs.getStringSet(key(type, false), emptySet())!!
            .sorted().joinToString(",")
        return "{\"developers\":[${array(BadgeType.DEV)}]," +
            "\"admins\":[${array(BadgeType.ADMIN)}]," +
            "\"vip\":[${array(BadgeType.VIP)}]," +
            "\"media\":[${array(BadgeType.MEDIA)}]}"
    }

    fun refreshRemote() {
        if (GRANTS_URL.isEmpty()) return
        val now = System.currentTimeMillis()
        if (now - lastFetch < REFRESH_MS) return
        lastFetch = now
        thread(name = "bloom-grants") {
            try {
                val c = URL(GRANTS_URL).openConnection() as HttpURLConnection
                c.connectTimeout = 10_000
                c.readTimeout = 10_000
                val body = c.inputStream.bufferedReader().use { it.readText() }
                val editor = prefs.edit()
                for (type in BadgeType.entries) {
                    val section = body.substringAfter("\"${type.jsonKey}\"", "")
                        .substringAfter("[", "")
                        .substringBefore("]", "")
                    val ids = Regex("\\d+").findAll(section).map { it.value }.toSet()
                    editor.putStringSet(key(type, true), ids)
                }
                editor.apply()
            } catch (t: Throwable) {
                FileLog.e(t)
            }
        }
    }

    fun userId(obj: TLRPC.User?): Long = obj?.id ?: 0L
}
