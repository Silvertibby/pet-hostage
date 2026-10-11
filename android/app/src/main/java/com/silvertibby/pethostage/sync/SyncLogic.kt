package com.silvertibby.pethostage.sync

import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

/** Pure sync rules (no Android APIs) so they can be unit-tested on the JVM. */
object SyncLogic {
    const val WORKER = "https://pet-hostage.silvertibby.workers.dev"
    const val APP_URL = "https://silvertibby.github.io/pet-hostage/"
    const val SRC = "android"

    /** The game judges days at midnight Pacific, so "today" is the Pacific calendar day, same as the worker. */
    val GAME_ZONE: ZoneId = ZoneId.of("America/Vancouver")

    /** Last-chance sync before the day is judged (local game time). */
    val PRE_MIDNIGHT: LocalTime = LocalTime.of(23, 50)

    private val CODE_RE = Regex("^[A-Z0-9]{6,20}$")
    private val PARAM_RE = Regex("""(?:^|[?&#])(?:c|code)=([A-Za-z0-9\- ]+)""")

    fun normCode(s: String?): String = s.orEmpty().trim().uppercase().replace(Regex("[^A-Z0-9]"), "")

    /**
     * Pulls a sync code out of whatever the player pasted or opened: a bare code ("ab3k-7xyz9q"),
     * a deep link (pethostage://setup?c=CODE), the web app link (...?c=CODE) or an iPhone Shortcut
     * sync URL (...?code=CODE&steps=). Returns null if nothing code-shaped is found.
     */
    fun extractCode(input: String?): String? {
        val t = input?.trim().orEmpty()
        if (t.isEmpty()) return null
        val m = PARAM_RE.find(t)
        val cand = when {
            m != null -> m.groupValues[1]
            t.contains("://") || t.contains("/") -> return null
            else -> t
        }
        val c = normCode(cand)
        return if (CODE_RE.matches(c)) c else null
    }

    data class GameDay(val date: String, val start: Instant, val end: Instant)

    /** Window to aggregate: game-day midnight up to now. */
    fun gameDay(now: Instant, zone: ZoneId = GAME_ZONE): GameDay {
        val d = now.atZone(zone).toLocalDate()
        return GameDay(d.toString(), d.atStartOfDay(zone).toInstant(), now)
    }

    /** Time from now until the next pre-midnight sync slot. */
    fun untilPreMidnight(now: Instant, zone: ZoneId = GAME_ZONE, at: LocalTime = PRE_MIDNIGHT): Duration {
        val z = now.atZone(zone)
        var target = z.toLocalDate().atTime(at).atZone(zone)
        if (!target.isAfter(z.plusSeconds(30))) target = z.toLocalDate().plusDays(1).atTime(at).atZone(zone)
        return Duration.between(now, target.toInstant())
    }

    /** Background runs skip posting the same number again within an hour, to keep the game's sync log readable. */
    fun shouldPost(manual: Boolean, steps: Long, date: String, lastSteps: Long?, lastDate: String?, lastPostAt: Long?, nowMs: Long): Boolean {
        if (manual || lastSteps == null || lastDate == null || lastPostAt == null) return true
        if (date != lastDate || steps != lastSteps) return true
        return nowMs - lastPostAt >= 60 * 60_000L
    }

    fun syncBody(code: String, steps: Long, date: String, appVersion: String): String = JSONObject()
        .put("code", normCode(code))
        .put("steps", steps.coerceAtLeast(0))
        .put("date", date)
        .put("src", SRC)
        .put("app", "android-$appVersion")
        .toString()

    data class Reply(val ok: Boolean, val stored: Long?, val petName: String?, val goal: Long?, val error: String?)

    fun parseReply(status: Int, body: String?): Reply {
        val j = try { JSONObject(body ?: "") } catch (e: Exception) { null }
        if (status in 200..299 && j != null && j.optBoolean("ok")) {
            val st = j.optJSONObject("state")
            val h = st?.optJSONObject("hostage")
            return Reply(true, if (j.has("steps")) j.optLong("steps") else null, h?.optString("name")?.takeIf { it.isNotEmpty() },
                st?.let { if (it.has("goal")) it.optLong("goal") else null }, null)
        }
        val reason = j?.optString("reason")?.takeIf { it.isNotEmpty() } ?: j?.optString("error")?.takeIf { it.isNotEmpty() } ?: "HTTP $status"
        return Reply(false, null, null, null, if (status == 404) "The game doesn't know this code. Check it in Pet Hostage → Step sync." else reason)
    }
}
