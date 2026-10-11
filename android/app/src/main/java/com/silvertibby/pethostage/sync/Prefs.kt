package com.silvertibby.pethostage.sync

import android.content.Context

class Prefs(ctx: Context) {
    private val p = ctx.applicationContext.getSharedPreferences("ph", Context.MODE_PRIVATE)
    var code: String? get() = p.getString("code", null); set(v) = p.edit().putString("code", v).apply()
    var lastPostAt: Long? get() = p.getLong("lastPostAt", 0).takeIf { it > 0 }; set(v) = p.edit().putLong("lastPostAt", v ?: 0).apply()
    var lastSteps: Long? get() = p.getLong("lastSteps", -1).takeIf { it >= 0 }; set(v) = p.edit().putLong("lastSteps", v ?: -1).apply()
    var lastDate: String? get() = p.getString("lastDate", null); set(v) = p.edit().putString("lastDate", v).apply()
    var lastStored: Long? get() = p.getLong("lastStored", -1).takeIf { it >= 0 }; set(v) = p.edit().putLong("lastStored", v ?: -1).apply()
    var petName: String? get() = p.getString("petName", null); set(v) = p.edit().putString("petName", v).apply()
    var goal: Long? get() = p.getLong("goal", -1).takeIf { it > 0 }; set(v) = p.edit().putLong("goal", v ?: -1).apply()
    var lastError: String? get() = p.getString("lastError", null); set(v) = p.edit().putString("lastError", v).apply()
    var lastErrorAt: Long? get() = p.getLong("lastErrorAt", 0).takeIf { it > 0 }; set(v) = p.edit().putLong("lastErrorAt", v ?: 0).apply()
    var lastReadSteps: Long? get() = p.getLong("lastReadSteps", -1).takeIf { it >= 0 }; set(v) = p.edit().putLong("lastReadSteps", v ?: -1).apply()
    var lastReadAt: Long? get() = p.getLong("lastReadAt", 0).takeIf { it > 0 }; set(v) = p.edit().putLong("lastReadAt", v ?: 0).apply()
}
