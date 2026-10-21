package com.droidcommander.usb

import android.content.Context
import android.os.Build
import android.provider.Settings

/** Read-only Android boot and verified-boot metadata collector. */
class BootStateCollector(private val context: Context) {
  fun collect(): Map<String, Any?> = mapOf(
    "manufacturer" to Build.MANUFACTURER,
    "model" to Build.MODEL,
    "device" to Build.DEVICE,
    "product" to Build.PRODUCT,
    "bootloader" to Build.BOOTLOADER,
    "androidVersion" to Build.VERSION.RELEASE,
    "sdkInt" to Build.VERSION.SDK_INT,
    "securityPatch" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Build.VERSION.SECURITY_PATCH else "",
    "verifiedBootState" to getProperty("ro.boot.verifiedbootstate"),
    "flashLocked" to getProperty("ro.boot.flash.locked"),
    "vbmetaDeviceState" to getProperty("ro.boot.vbmeta.device_state"),
    "verityMode" to getProperty("ro.boot.veritymode"),
    "oemUnlockAllowed" to (Settings.Global.getString(context.contentResolver, "oem_unlock_allowed") ?: ""),
  )

  private fun getProperty(name: String): String {
    // Fixed property names only; no caller-provided shell text is accepted.
    return try {
      val process = ProcessBuilder("getprop", name).redirectErrorStream(true).start()
      if (!process.waitFor(2, java.util.concurrent.TimeUnit.SECONDS)) {
        process.destroyForcibly()
        return ""
      }
      process.inputStream.bufferedReader().use { it.readText().trim() }
    } catch (_: Exception) {
      ""
    }
  }
}
