package com.silvertibby.pethostage.sync

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * Background schedule: a WorkManager job every ~15 min (Android decides the exact moment, batching with
 * other apps), plus a pre-midnight sync at ~11:50 PM Pacific (an idle-allowed alarm, backed by a one-time job)
 * because the game judges the day at midnight with whatever was synced last.
 */
object Scheduler {
    private val net = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    fun start(ctx: Context) {
        val req = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(net).setBackoffCriteria(BackoffPolicy.LINEAR, 2, TimeUnit.MINUTES).build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("ph-periodic", ExistingPeriodicWorkPolicy.UPDATE, req)
        scheduleMidnight(ctx)
    }

    fun stop(ctx: Context) {
        WorkManager.getInstance(ctx).cancelUniqueWork("ph-periodic")
        (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmIntent(ctx))
    }

    fun syncSoon(ctx: Context, tag: String) {
        WorkManager.getInstance(ctx).enqueueUniqueWork("ph-now-$tag", ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(net).build())
    }

    fun scheduleMidnight(ctx: Context) {
        if (Prefs(ctx).code == null) return
        val now = Instant.now()
        val wait = SyncLogic.untilPreMidnight(now)
        val date = SyncLogic.gameDay(now.plus(wait)).date
        // Backup job (KEEP: one per game day).
        WorkManager.getInstance(ctx).enqueueUniqueWork("ph-midnight-$date", ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(net).setInitialDelay(wait.toMillis() + 120_000, TimeUnit.MILLISECONDS).build())
        // Alarm: allowed to fire in Doze; inexact by a few minutes, so aim at 11:50.
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + wait.toMillis(), alarmIntent(ctx))
    }

    private fun alarmIntent(ctx: Context): PendingIntent = PendingIntent.getBroadcast(ctx, 1,
        Intent(ctx, MidnightReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
}

class MidnightReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        Scheduler.syncSoon(ctx, "midnight")
        Scheduler.scheduleMidnight(ctx) // re-arm for tomorrow
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (Prefs(ctx).code != null) Scheduler.start(ctx)
    }
}
