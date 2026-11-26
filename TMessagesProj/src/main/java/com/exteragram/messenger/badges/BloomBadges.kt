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
 * - Creator badge: shown for [CREATOR_ID] (the owner, @vlodt).
 * - Developer badge: the creator account can grant/revoke it for any user id.
 *   Grants are stored locally and, if [GRANTS_URL] is set, merged with a remote
 *   JSON list (e.g. {"developers":[123,456]}) so every BloomGram client sees them.
 *
 * Badges are rendered client-side only: users of other Telegram clients never see them.
 */
object BloomBadges {

    /** Numeric Telegram user id of @vlodt. Fill in (see @userinfobot). */
    const val CREATOR_ID = 5853805443L
    const val CREATOR_USERNAME = "vlodt"

    /** Optional: raw JSON file shared by all BloomGram clients, e.g. a GitHub raw URL. */
    const val GRANTS_URL = ""

    /** Custom-emoji document ids. Replace CREATOR_EMOJI_ID with your own unique emoji. */
    private const val CREATOR_EMOJI_ID = 5359407509327085568L

    private const val PREFS = "bloomgram_badges"
    private const val KEY_LOCAL = "local_devs"
    private const val KEY_REMOTE = "remote_devs"
    private const val REFRESH_MS = 10 * 60 * 1000L

    val CREATOR_BADGE = BadgeDTO(CREATOR_EMOJI_ID, "{name} is the creator of BloomGram.")
    val DEV_BADGE = BadgeDTO(BadgesController.DEV_BADGE.documentId, "{name} is a member of the BloomGram development team.")

    private val prefs: SharedPreferences
        get() = ApplicationLoader.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    @Volatile private var lastFetch = 0L

    fun isCreator(id: Long): Boolean = CREATOR_ID != 0L && id == CREATOR_ID

    /** True if the signed-in account is the creator. Id is authoritative; username is a fallback until CREATOR_ID is set. */
    fun isCurrentUserCreator(): Boolean {
        val user = UserConfig.getInstance(UserConfig.selectedAccount).currentUser ?: return false
        if (CREATOR_ID != 0L) return user.id == CREATOR_ID
        return UserObject.getPublicUsername(user).equals(CREATOR_USERNAME, ignoreCase = true)
    }

    fun isGrantedDeveloper(id: Long): Boolean {
        val key = id.toString()
        return prefs.getStringSet(KEY_LOCAL, emptySet())!!.contains(key) ||
            prefs.getStringSet(KEY_REMOTE, emptySet())!!.contains(key)
    }

    fun isDev(id: Long): Boolean = isCreator(id) || isGrantedDeveloper(id)

    fun badgeFor(id: Long): BadgeDTO? = when {
        isCreator(id) -> CREATOR_BADGE
        isGrantedDeveloper(id) -> DEV_BADGE
        else -> null
    }

    /** Creator only. Returns false if the caller is not allowed. */
    fun grant(id: Long): Boolean {
        if (!isCurrentUserCreator()) return false
        val set = HashSet(prefs.getStringSet(KEY_LOCAL, emptySet())!!)
        set.add(id.toString())
        prefs.edit().putStringSet(KEY_LOCAL, set).apply()
        return true
    }

    fun revoke(id: Long): Boolean {
        if (!isCurrentUserCreator()) return false
        val set = HashSet(prefs.getStringSet(KEY_LOCAL, emptySet())!!)
        set.remove(id.toString())
        prefs.edit().putStringSet(KEY_LOCAL, set).apply()
        return true
    }

    /** Exports local grants as JSON to paste into the file behind [GRANTS_URL]. */
    fun exportGrantsJson(): String {
        val ids = prefs.getStringSet(KEY_LOCAL, emptySet())!!.sorted().joinToString(",")
        return "{\"developers\":[$ids]}"
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
                val ids = Regex("\\d+").findAll(body.substringAfter("[", "").substringBefore("]", ""))
                    .map { it.value }.toSet()
                prefs.edit().putStringSet(KEY_REMOTE, ids).apply()
            } catch (t: Throwable) {
                FileLog.e(t)
            }
        }
    }

    fun userId(obj: TLRPC.User?): Long = obj?.id ?: 0L
}
