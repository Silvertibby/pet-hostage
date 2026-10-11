package com.silvertibby.pethostage.sync

import android.app.Activity
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

/** Shown by Health Connect when the user asks why the app wants step data. */
class PrivacyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (18 * resources.displayMetrics.density).toInt()
        setContentView(ScrollView(this).apply {
            addView(TextView(this@PrivacyActivity).apply {
                setPadding(pad, pad, pad, pad); textSize = 20f
                text = "Pet Hostage Sync: privacy\n\n" +
                    "• Reads only your step count from Health Connect. No other health data.\n" +
                    "• Sends one number, today's total steps, plus today's date and your Pet Hostage sync code, to the Pet Hostage game server (pet-hostage.silvertibby.workers.dev).\n" +
                    "• No accounts, no passwords, no ads, no tracking. Nothing is shared with anyone else.\n" +
                    "• Turn it off any time in Health Connect → App permissions, or uninstall the app."
            })
        })
    }
}
