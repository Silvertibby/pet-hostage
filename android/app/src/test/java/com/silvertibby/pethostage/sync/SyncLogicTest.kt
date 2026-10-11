package com.silvertibby.pethostage.sync

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.time.Duration
import java.time.Instant
import java.time.ZonedDateTime

class SyncLogicTest {
    private fun pt(s: String): Instant = ZonedDateTime.parse(s + "[America/Vancouver]").toInstant()

    @Test fun extractsCodesFromEverywhere() {
        assertEquals("AB3K7XYZ9Q", SyncLogic.extractCode("ab3k7xyz9q"))
        assertEquals("AB3K7XYZ9Q", SyncLogic.extractCode("  AB3K-7XYZ9Q \n"))
        assertEquals("AB3K7XYZ9Q", SyncLogic.extractCode("pethostage://setup?c=AB3K7XYZ9Q"))
        assertEquals("AB3K7XYZ9Q", SyncLogic.extractCode("https://silvertibby.github.io/pet-hostage/?c=ab3k7xyz9q"))
        assertEquals("AB3K7XYZ9Q", SyncLogic.extractCode("https://pet-hostage.silvertibby.workers.dev/sync?code=AB3K7XYZ9Q&steps="))
        assertEquals("AB3K7XYZ9Q", SyncLogic.extractCode("https://x.test/#c=AB3K7XYZ9Q"))
        assertNull(SyncLogic.extractCode(""))
        assertNull(SyncLogic.extractCode("abc"))
        assertNull(SyncLogic.extractCode("https://silvertibby.github.io/pet-hostage/"))
        assertNull(SyncLogic.extractCode("pethostage://setup"))
    }

    @Test fun gameDayIsPacific() {
        // 11:30 PM in Vancouver is already the next day in UTC; we still count Vancouver's day.
        val d = SyncLogic.gameDay(pt("2026-10-10T23:30:00-07:00"))
        assertEquals("2026-10-10", d.date)
        assertEquals(pt("2026-10-10T00:00:00-07:00"), d.start)
        assertEquals("2026-10-11", SyncLogic.gameDay(pt("2026-10-11T00:01:00-07:00")).date)
        // DST end (Nov 1 2026): the day still starts at local midnight
        assertEquals(pt("2026-11-01T00:00:00-07:00"), SyncLogic.gameDay(pt("2026-11-01T12:00:00-08:00")).start)
    }

    @Test fun preMidnightSlot() {
        assertEquals(Duration.ofMinutes(50), SyncLogic.untilPreMidnight(pt("2026-10-10T23:00:00-07:00")))
        assertEquals(Duration.ofHours(24), SyncLogic.untilPreMidnight(pt("2026-10-10T23:50:00-07:00")))
        assertEquals(Duration.ofMinutes(23 * 60 + 55), SyncLogic.untilPreMidnight(pt("2026-10-10T23:55:00-07:00")))
        assertEquals(Duration.ofHours(23).plusMinutes(50), SyncLogic.untilPreMidnight(pt("2026-10-10T00:00:00-07:00")))
    }

    @Test fun skipsRepeatPostsInTheBackgroundOnly() {
        val now = 10_000_000L
        assertTrue(SyncLogic.shouldPost(false, 100, "2026-10-10", null, null, null, now))
        assertFalse(SyncLogic.shouldPost(false, 100, "2026-10-10", 100, "2026-10-10", now - 5 * 60_000, now))
        assertTrue(SyncLogic.shouldPost(true, 100, "2026-10-10", 100, "2026-10-10", now - 5 * 60_000, now))
        assertTrue(SyncLogic.shouldPost(false, 101, "2026-10-10", 100, "2026-10-10", now - 5 * 60_000, now))
        assertTrue(SyncLogic.shouldPost(false, 100, "2026-10-11", 100, "2026-10-10", now - 5 * 60_000, now))
        assertTrue(SyncLogic.shouldPost(false, 100, "2026-10-10", 100, "2026-10-10", now - 61 * 60_000, now))
    }

    @Test fun bodyMatchesWorkerFormat() {
        val j = JSONObject(SyncLogic.syncBody("ab3k-7xyz9q", 4321, "2026-10-10", "0.1.0"))
        assertEquals("AB3K7XYZ9Q", j.getString("code"))
        assertEquals(4321, j.getLong("steps"))
        assertEquals("2026-10-10", j.getString("date"))
        assertEquals("android", j.getString("src"))
        assertEquals("android-0.1.0", j.getString("app"))
        assertEquals(0, JSONObject(SyncLogic.syncBody("AB3K7XYZ9Q", -5, "2026-10-10", "x")).getLong("steps"))
    }

    @Test fun parsesReplies() {
        val ok = SyncLogic.parseReply(200, """{"ok":true,"steps":9500,"state":{"goal":10000,"hostage":{"name":"Bun"}}}""")
        assertTrue(ok.ok); assertEquals(9500L, ok.stored); assertEquals("Bun", ok.petName); assertEquals(10000L, ok.goal)
        val unknown = SyncLogic.parseReply(404, """{"error":"unknown code","reason":"Unknown code X."}""")
        assertFalse(unknown.ok); assertTrue(unknown.error!!.contains("doesn't know"))
        val bad = SyncLogic.parseReply(400, """{"error":"steps missing or weird","reason":"steps not a number"}""")
        assertEquals("steps not a number", bad.error)
        assertEquals("HTTP 502", SyncLogic.parseReply(502, "<html>").error)
    }
}
