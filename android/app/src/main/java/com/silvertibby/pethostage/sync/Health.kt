package com.silvertibby.pethostage.sync

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter

/** Health Connect: built into Android 14+, a Play Store app on Android 9–13 (API 28+). */
object Health {
    const val PROVIDER = "com.google.android.apps.healthdata"
    val READ_STEPS = HealthPermission.getReadPermission(StepsRecord::class)
    const val READ_BACKGROUND = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

    enum class Avail { READY, NEEDS_INSTALL_OR_UPDATE, UNSUPPORTED }

    fun availability(ctx: Context): Avail = when (HealthConnectClient.getSdkStatus(ctx, PROVIDER)) {
        HealthConnectClient.SDK_AVAILABLE -> Avail.READY
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> Avail.NEEDS_INSTALL_OR_UPDATE
        else -> Avail.UNSUPPORTED
    }

    fun client(ctx: Context) = HealthConnectClient.getOrCreate(ctx, PROVIDER)

    fun backgroundSupported(c: HealthConnectClient): Boolean = try {
        c.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
    } catch (e: Throwable) { false }

    fun permissionsToRequest(c: HealthConnectClient): Set<String> =
        if (backgroundSupported(c)) setOf(READ_STEPS, READ_BACKGROUND) else setOf(READ_STEPS)

    suspend fun granted(c: HealthConnectClient): Set<String> = c.permissionController.getGrantedPermissions()

    /** Health Connect's own deduplicated total (phone + Garmin etc. counted once, by its data-source priority). */
    suspend fun steps(c: HealthConnectClient, day: SyncLogic.GameDay): Long =
        c.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(day.start, day.end)))[StepsRecord.COUNT_TOTAL] ?: 0L

    fun installIntent(): Intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$PROVIDER&url=healthconnect%3A%2F%2Fonboarding"))
        .setPackage("com.android.vending").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    fun settingsIntent(ctx: Context): Intent = HealthConnectClient.getHealthConnectManageDataIntent(ctx, PROVIDER)
}
