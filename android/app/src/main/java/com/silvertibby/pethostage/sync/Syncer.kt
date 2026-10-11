package com.silvertibby.pethostage.sync

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

/** One sync: read today's steps from Health Connect, POST them to the game. */
object Syncer {
    sealed class Outcome {
        data class Sent(val steps: Long, val stored: Long?) : Outcome()
        data class Skipped(val steps: Long) : Outcome()
        data class Failed(val message: String, val retry: Boolean) : Outcome()
    }

    suspend fun run(ctx: Context, manual: Boolean): Outcome {
        val prefs = Prefs(ctx)
        val code = prefs.code ?: return fail(prefs, "No sync code yet.", false)
        if (Health.availability(ctx) != Health.Avail.READY) return fail(prefs, "Health Connect isn't available.", false)
        val hc = Health.client(ctx)
        val day = SyncLogic.gameDay(Instant.now())
        val steps = try {
            if (Health.READ_STEPS !in Health.granted(hc)) return fail(prefs, "Steps permission is off. Open the app and allow it.", false)
            Health.steps(hc, day)
        } catch (e: SecurityException) {
            return fail(prefs, if (manual) "Health Connect said no: ${e.message}" else "Health Connect blocked a background read. Open the app to sync.", false)
        } catch (e: Exception) {
            return fail(prefs, "Couldn't read steps: ${e.message}", true)
        }
        prefs.lastReadSteps = steps; prefs.lastReadAt = System.currentTimeMillis()
        val now = System.currentTimeMillis()
        if (!SyncLogic.shouldPost(manual, steps, day.date, prefs.lastSteps, prefs.lastDate, prefs.lastPostAt, now)) return Outcome.Skipped(steps)
        val (status, body) = try { post(SyncLogic.syncBody(code, steps, day.date, BuildConfig.VERSION_NAME)) }
        catch (e: Exception) { return fail(prefs, "No connection to the game (${e.javaClass.simpleName}).", true) }
        val r = SyncLogic.parseReply(status, body)
        if (!r.ok) return fail(prefs, r.error ?: "HTTP $status", status >= 500)
        prefs.lastPostAt = now; prefs.lastSteps = steps; prefs.lastDate = day.date; prefs.lastStored = r.stored
        r.petName?.let { prefs.petName = it }; r.goal?.let { prefs.goal = it }
        prefs.lastError = null; prefs.lastErrorAt = null
        return Outcome.Sent(steps, r.stored)
    }

    private fun fail(p: Prefs, msg: String, retry: Boolean): Outcome { p.lastError = msg; p.lastErrorAt = System.currentTimeMillis(); return Outcome.Failed(msg, retry) }

    suspend fun post(json: String): Pair<Int, String> = withContext(Dispatchers.IO) {
        val c = URL(SyncLogic.WORKER + "/sync").openConnection() as HttpURLConnection
        try {
            c.requestMethod = "POST"; c.connectTimeout = 15_000; c.readTimeout = 20_000; c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.setRequestProperty("User-Agent", "PetHostageSync/${BuildConfig.VERSION_NAME} Android")
            c.outputStream.use { it.write(json.toByteArray()) }
            val code = c.responseCode
            val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
            code to text
        } finally { c.disconnect() }
    }

    /** Checks a code exists before saving it. true = known, false = unknown, null = couldn't tell (offline). */
    suspend fun codeExists(code: String): Boolean? = withContext(Dispatchers.IO) {
        try {
            val c = URL(SyncLogic.WORKER + "/state?code=" + SyncLogic.normCode(code)).openConnection() as HttpURLConnection
            c.connectTimeout = 15_000; c.readTimeout = 20_000
            val r = c.responseCode; c.disconnect()
            when (r) { 200 -> true; 404, 400 -> false; else -> null }
        } catch (e: Exception) { null }
    }
}
