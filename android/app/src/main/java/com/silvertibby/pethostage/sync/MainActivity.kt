package com.silvertibby.pethostage.sync

import android.content.ActivityNotFoundException
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {
    private lateinit var prefs: Prefs
    private val v = object {
        lateinit var setup: View; lateinit var hc: View; lateinit var status: View
        lateinit var codeInput: EditText; lateinit var hcTitle: TextView; lateinit var hcText: TextView; lateinit var hcButton: Button
        lateinit var steps: TextView; lateinit var goal: TextView; lateinit var bar: ProgressBar; lateinit var lastSync: TextView
        lateinit var error: TextView; lateinit var petLine: TextView; lateinit var bgInfo: TextView; lateinit var syncNow: Button
    }
    private var busy = false

    private val askPermissions = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        if (Health.READ_STEPS in granted) {
            Scheduler.start(this)
            toast("Steps allowed. Syncing…")
            syncNow(manual = true)
        } else {
            toast("Steps weren't allowed. Tap “Allow steps” to try again.")
        }
        render()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        setContentView(R.layout.activity_main)
        v.setup = findViewById(R.id.setup); v.hc = findViewById(R.id.hc); v.status = findViewById(R.id.status)
        v.codeInput = findViewById(R.id.codeInput); v.hcTitle = findViewById(R.id.hcTitle); v.hcText = findViewById(R.id.hcText); v.hcButton = findViewById(R.id.hcButton)
        v.steps = findViewById(R.id.steps); v.goal = findViewById(R.id.goal); v.bar = findViewById(R.id.bar); v.lastSync = findViewById(R.id.lastSync)
        v.error = findViewById(R.id.error); v.petLine = findViewById(R.id.petLine); v.bgInfo = findViewById(R.id.bgInfo); v.syncNow = findViewById(R.id.syncNow)
        findViewById<TextView>(R.id.ver).text = "v" + BuildConfig.VERSION_NAME

        findViewById<Button>(R.id.paste).setOnClickListener {
            val clip = (getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).primaryClip
            val t = clip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString().orEmpty()
            val c = SyncLogic.extractCode(t)
            if (c != null) { v.codeInput.setText(c); connect(c) } else toast("No code on the clipboard. Copy it from Pet Hostage → Step sync.")
        }
        findViewById<Button>(R.id.connect).setOnClickListener { onConnectTapped() }
        v.codeInput.setOnEditorActionListener { _, id, _ -> if (id == EditorInfo.IME_ACTION_DONE) { onConnectTapped(); true } else false }
        v.syncNow.setOnClickListener { syncNow(manual = true) }
        findViewById<Button>(R.id.openGame).setOnClickListener { open(SyncLogic.APP_URL + (prefs.code?.let { "?c=$it" } ?: "")) }
        findViewById<TextView>(R.id.changeCode).setOnClickListener {
            prefs.code = null; prefs.lastPostAt = null; prefs.lastSteps = null; prefs.lastDate = null; prefs.lastStored = null; prefs.petName = null; prefs.lastError = null
            Scheduler.stop(this); render()
        }
        findViewById<TextView>(R.id.hcSettings).setOnClickListener {
            try { startActivity(Health.settingsIntent(this)) } catch (e: Exception) { toast("Couldn't open Health Connect") }
        }
        handleLink(intent)
    }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); handleLink(intent) }

    override fun onResume() {
        super.onResume()
        render()
        if (prefs.code != null && Health.availability(this) == Health.Avail.READY) syncNow(manual = false, quiet = true)
    }

    private fun handleLink(i: Intent?) {
        val data = i?.data ?: return
        val c = SyncLogic.extractCode(data.toString()) ?: return toast("That link didn't have a sync code in it.")
        i.data = null
        v.codeInput.setText(c)
        if (c != prefs.code) connect(c)
    }

    private fun onConnectTapped() {
        val c = SyncLogic.extractCode(v.codeInput.text.toString())
        if (c == null) toast("That doesn't look like a sync code (6–20 letters and numbers).") else connect(c)
    }

    private fun connect(c: String) {
        if (busy) return
        busy = true
        lifecycleScope.launch {
            when (Syncer.codeExists(c)) {
                false -> toast("The game doesn't know $c. Check it in Pet Hostage → Step sync.")
                else -> { // true, or offline: save it anyway and try later
                    prefs.code = c; prefs.lastPostAt = null; prefs.lastError = null
                    toast("Code saved: $c")
                    if (Health.availability(this@MainActivity) == Health.Avail.READY) {
                        val hc = Health.client(this@MainActivity)
                        if (Health.READ_STEPS !in Health.granted(hc)) askPermissions.launch(Health.permissionsToRequest(hc))
                        else { Scheduler.start(this@MainActivity); busy = false; syncNow(manual = true) }
                    }
                }
            }
            busy = false
            render()
        }
    }

    private fun render() {
        val code = prefs.code
        v.setup.visibility = if (code == null) View.VISIBLE else View.GONE
        if (code == null) { v.hc.visibility = View.GONE; v.status.visibility = View.GONE; return }
        when (Health.availability(this)) {
            Health.Avail.UNSUPPORTED -> showHc("HEALTH CONNECT", "This phone can't run Health Connect, which is where Garmin shares your steps. It needs Android 9 or newer.", null) {}
            Health.Avail.NEEDS_INSTALL_OR_UPDATE -> showHc("2. GET HEALTH CONNECT", "Your phone needs the free Health Connect app (or an update to it) from the Play Store. Install it, then come back here.", "Get Health Connect") {
                try { startActivity(Health.installIntent()) } catch (e: ActivityNotFoundException) { open("https://play.google.com/store/apps/details?id=${Health.PROVIDER}") }
            }
            Health.Avail.READY -> lifecycleScope.launch {
                val hc = Health.client(this@MainActivity)
                val granted = try { Health.granted(hc) } catch (e: Exception) { emptySet() }
                if (Health.READ_STEPS !in granted) {
                    showHc("2. ALLOW STEPS", "Pet Hostage Sync only reads your step count. Nothing else, and it only sends the daily total to your game.", "Allow steps") {
                        askPermissions.launch(Health.permissionsToRequest(hc))
                    }
                } else {
                    v.hc.visibility = View.GONE
                    showStatus(Health.backgroundSupported(hc), Health.READ_BACKGROUND in granted, hc)
                }
            }
        }
    }

    private fun showHc(title: String, text: String, button: String?, onClick: () -> Unit) {
        v.status.visibility = View.GONE; v.hc.visibility = View.VISIBLE
        v.hcTitle.text = title; v.hcText.text = text
        v.hcButton.visibility = if (button == null) View.GONE else View.VISIBLE
        v.hcButton.text = button ?: ""; v.hcButton.setOnClickListener { onClick() }
    }

    private fun showStatus(bgSupported: Boolean, bgGranted: Boolean, hc: androidx.health.connect.client.HealthConnectClient) {
        v.status.visibility = View.VISIBLE
        val nf = NumberFormat.getIntegerInstance()
        val today = SyncLogic.gameDay(Instant.now()).date
        val read = prefs.lastReadSteps?.takeIf { prefs.lastDate == today || prefs.lastReadAt?.let { SyncLogic.gameDay(Instant.ofEpochMilli(it)).date == today } == true }
        val goal = prefs.goal ?: 10_000
        v.steps.text = read?.let { nf.format(it) } ?: "—"
        v.goal.text = "/ " + nf.format(goal)
        v.bar.max = goal.toInt(); v.bar.progress = (read ?: 0).coerceAtMost(goal).toInt()
        v.bar.progressTintList = android.content.res.ColorStateList.valueOf(getColor(if ((read ?: 0) >= goal) R.color.good else R.color.acc))
        v.petLine.text = prefs.petName?.let { "TODAY · ${it.uppercase()}" } ?: "TODAY"
        val at = prefs.lastPostAt
        v.lastSync.text = if (at == null) "Not synced yet. Code ${prefs.code}" else
            "Synced ${ago(at)} (${clock(at)})" + (prefs.lastStored?.let { s -> if (s != prefs.lastSteps) " · game has ${nf.format(s)}" else "" } ?: "") + "\nCode ${prefs.code}"
        val err = prefs.lastError
        v.error.visibility = if (err != null) View.VISIBLE else View.GONE
        v.error.text = err?.let { "⚠ $it" + (prefs.lastErrorAt?.let { t -> " (${ago(t)})" } ?: "") }
        v.bgInfo.text = when {
            bgSupported && bgGranted -> "Syncs on its own about every 15 minutes, plus once around 11:50 PM Pacific. Days are judged at midnight Pacific."
            bgSupported -> "Background sync is off. Tap here to allow it, or the game only gets steps when you open this app."
            else -> "This phone's Health Connect only lets apps read steps while they're open. Open this app before midnight Pacific to sync (or update Health Connect)."
        }
        v.bgInfo.setOnClickListener { if (bgSupported && !bgGranted) askPermissions.launch(Health.permissionsToRequest(hc)) }
    }

    private fun syncNow(manual: Boolean, quiet: Boolean = false) {
        if (busy) return
        busy = true; v.syncNow.isEnabled = false; v.syncNow.text = "Syncing…"
        lifecycleScope.launch {
            val o = Syncer.run(this@MainActivity, manual)
            busy = false; v.syncNow.isEnabled = true; v.syncNow.text = "Sync now"
            if (!quiet || o is Syncer.Outcome.Failed) when (o) {
                is Syncer.Outcome.Sent -> toast("Sent ${NumberFormat.getIntegerInstance().format(o.steps)} steps to The Raccoon")
                is Syncer.Outcome.Skipped -> {}
                is Syncer.Outcome.Failed -> if (!quiet) toast(o.message)
            }
            render()
        }
    }

    private fun open(url: String) { try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (e: Exception) { toast("No browser found") } }
    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()
    private fun ago(ms: Long): String { val m = (System.currentTimeMillis() - ms) / 60000; return when { m < 1 -> "just now"; m < 60 -> "$m min ago"; m < 1440 -> "${m / 60}h ago"; else -> "${m / 1440}d ago" } }
    private fun clock(ms: Long): String = DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.systemDefault()).format(Instant.ofEpochMilli(ms))
}
