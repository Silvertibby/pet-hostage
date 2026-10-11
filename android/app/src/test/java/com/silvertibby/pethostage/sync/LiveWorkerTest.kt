package com.silvertibby.pethostage.sync

import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant

/**
 * Optional end-to-end check against the live worker, using a TEST player code only:
 *   PH_LIVE_CODE=<test code> ./gradlew testReleaseUnitTest
 * Skipped when PH_LIVE_CODE isn't set.
 */
class LiveWorkerTest {
    private fun post(json: String): Pair<Int, String> {
        val c = URL(SyncLogic.WORKER + "/sync").openConnection() as HttpURLConnection
        c.requestMethod = "POST"; c.doOutput = true; c.setRequestProperty("Content-Type", "application/json")
        c.outputStream.use { it.write(json.toByteArray()) }
        val code = c.responseCode
        return code to ((if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.readText() ?: "")
    }

    @Test fun syncReachesWorkerAndNeverLowers() {
        val code = System.getenv("PH_LIVE_CODE")
        assumeTrue(!code.isNullOrBlank())
        val date = SyncLogic.gameDay(Instant.now()).date
        val (s1, b1) = post(SyncLogic.syncBody(code!!, 1234, date, "test"))
        val r1 = SyncLogic.parseReply(s1, b1)
        assertTrue(b1, r1.ok); assertTrue(r1.stored!! >= 1234)
        val (s2, b2) = post(SyncLogic.syncBody(code, 1000, date, "test"))
        val r2 = SyncLogic.parseReply(s2, b2)
        assertTrue(r2.ok); assertEquals(r1.stored, r2.stored) // a lower Health Connect reading doesn't lower the day
        val (s3, b3) = post(SyncLogic.syncBody("ZZZZZZZZZZ", 5, date, "test")) // unknown code: rejected, nothing stored
        val r3 = SyncLogic.parseReply(s3, b3)
        assertEquals(404, s3); assertFalse(r3.ok)
    }
}
