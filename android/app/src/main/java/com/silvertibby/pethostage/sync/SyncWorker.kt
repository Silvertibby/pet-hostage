package com.silvertibby.pethostage.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        Scheduler.scheduleMidnight(applicationContext) // keep the pre-midnight safety net armed
        return when (val o = Syncer.run(applicationContext, manual = false)) {
            is Syncer.Outcome.Failed -> if (o.retry && runAttemptCount < 3) Result.retry() else Result.success()
            else -> Result.success()
        }
    }
}
