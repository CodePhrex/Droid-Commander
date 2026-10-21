package com.droidcommander.usb

import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.StatFs
import android.provider.Settings
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/** Read-only, non-identifying observations about the local Android device and this app. */
class LocalDeviceCollector(private val context: Context) {
  fun collect(): Map<String, Any?> = mapOf(
    "manufacturer" to buildString { Build.MANUFACTURER },
    "brand" to buildString { Build.BRAND },
    "model" to buildString { Build.MODEL },
    "device" to buildString { Build.DEVICE },
    "product" to buildString { Build.PRODUCT },
    "androidVersion" to buildString { Build.VERSION.RELEASE },
    "sdkInt" to safe { Build.VERSION.SDK_INT },
    "securityPatch" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      buildString { Build.VERSION.SECURITY_PATCH }
    } else {
      null
    },
    "buildId" to buildString { Build.ID },
    "buildDisplay" to buildString { Build.DISPLAY },
    "buildType" to buildString { Build.TYPE },
    "bootloader" to buildString { Build.BOOTLOADER },
    "supportedAbis" to supportedAbis(),
    "systemBuildFingerprint" to buildString { Build.FINGERPRINT },
    "verifiedBootState" to systemProperty("ro.boot.verifiedbootstate"),
    "flashLocked" to systemProperty("ro.boot.flash.locked"),
    "vbmetaDeviceState" to systemProperty("ro.boot.vbmeta.device_state"),
    "verityMode" to systemProperty("ro.boot.veritymode"),
    "developerOptionsEnabled" to globalBoolean("development_settings_enabled"),
    "adbEnabled" to globalBoolean("adb_enabled"),
    "secureScreenLock" to keyguardValue { isDeviceSecure },
    "deviceLocked" to keyguardValue { isDeviceLocked },
    "usbHostSupported" to safe { context.packageManager.hasSystemFeature(PackageManager.FEATURE_USB_HOST) },
    "usbAccessorySupported" to safe { context.packageManager.hasSystemFeature(PackageManager.FEATURE_USB_ACCESSORY) },
    "usbDeviceCount" to usbDeviceCount(),
    "appInstallRequestsAllowed" to appInstallRequestsAllowed(),
    "totalMemoryBytes" to totalMemoryBytes(),
    "appStorageTotalBytes" to appStorageBytes { totalBytes },
    "appStorageAvailableBytes" to appStorageBytes { availableBytes },
    "appVersion" to appVersion(),
    "collectedAt" to isoUtc(),
    "limitations" to limitations,
  )

  private fun globalBoolean(name: String): Boolean? = safe {
    when (Settings.Global.getString(context.contentResolver, name)) {
      "1" -> true
      "0" -> false
      else -> null
    }
  }

  private fun supportedAbis(): List<String>? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return null
    return safe { Build.SUPPORTED_ABIS.mapNotNull { it.trim().takeIf(String::isNotEmpty) } }
  }

  private fun systemProperty(name: String): String? = safe {
    // Names are fixed at call sites; no caller-provided shell text reaches this process.
    val process = ProcessBuilder("getprop", name).redirectErrorStream(true).start()
    if (!process.waitFor(200, TimeUnit.MILLISECONDS)) {
      process.destroyForcibly()
      return@safe null
    }
    if (process.exitValue() != 0) return@safe null
    process.inputStream.bufferedReader().use { it.readText().trim().takeIf(String::isNotEmpty) }
  }

  private fun keyguardValue(read: KeyguardManager.() -> Boolean): Boolean? = safe {
    val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
      ?: return@safe null
    keyguardManager.read()
  }

  private fun usbDeviceCount(): Int? = safe {
    val usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager
      ?: return@safe null
    // Reading the count does not open a device or request USB permission.
    usbManager.deviceList.size
  }

  private fun appInstallRequestsAllowed(): Boolean? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
    return safe { context.packageManager.canRequestPackageInstalls() }
  }

  private fun totalMemoryBytes(): Double? = safe {
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      ?: return@safe null
    val memoryInfo = ActivityManager.MemoryInfo()
    activityManager.getMemoryInfo(memoryInfo)
    memoryInfo.totalMem.toDouble()
  }

  private fun appStorageBytes(read: StatFs.() -> Long): Double? = safe {
    val stats = StatFs(context.filesDir.absolutePath)
    stats.read().toDouble()
  }

  private fun appVersion(): String? = safe {
    val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.packageManager.getPackageInfo(
        context.packageName,
        PackageManager.PackageInfoFlags.of(0),
      )
    } else {
      @Suppress("DEPRECATION")
      context.packageManager.getPackageInfo(context.packageName, 0)
    }
    packageInfo.versionName?.trim()?.takeIf { it.isNotEmpty() }
  }

  private fun isoUtc(): String? = safe {
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date())
  }

  private fun buildString(read: () -> String?): String? = safe {
    read()?.trim()?.takeIf { it.isNotEmpty() }
  }

  private inline fun <T> safe(read: () -> T): T? = try {
    read()
  } catch (_: Exception) {
    null
  }

  private companion object {
    val limitations = listOf(
      "Read-only local observations only; no root, ADB, or device-setting changes are performed.",
      "No hardware identifiers, network identifiers, USB device paths, package lists, or device contents are collected.",
      "USB reporting is limited to feature flags and an attached-device count; no USB device is opened and no permission is requested.",
      "Developer-options and ADB values are null when Settings.Global is unavailable, inaccessible, or unrecognized.",
      "Boot-state values use fixed read-only system-property names and are null when unavailable.",
      "Install-request permission reflects only this app's capability, not a device-wide policy.",
      "Unavailable or unreadable platform values are reported as null rather than inferred.",
    )
  }
}
