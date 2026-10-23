package com.droidcommander.usb

import android.content.pm.PackageManager
import android.hardware.usb.UsbManager
import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Real-device checks; authored coverage is not evidence they have executed on the A15. */
@RunWith(AndroidJUnit4::class)
class LocalDeviceCollectorInstrumentedTest {
  private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

  @Test
  fun buildIdentityMatchesTheDeviceRunningTheCollector() {
    val report = LocalDeviceCollector(context).collect()
    assertEquals(Build.MANUFACTURER, report["manufacturer"])
    assertEquals(Build.MODEL, report["model"])
    assertEquals(Build.VERSION.RELEASE, report["androidVersion"])
    assertEquals(Build.VERSION.SDK_INT, report["sdkInt"])
    assertEquals(Build.ID, report["buildId"])
    assertEquals(Build.DISPLAY, report["buildDisplay"])
    assertNotNull(report["collectedAt"])
  }

  @Test
  fun usbFeaturesAndCountMatchReadOnlyPlatformEnumeration() {
    val manager = context.getSystemService(android.content.Context.USB_SERVICE) as? UsbManager
    val before = manager?.deviceList?.size
    val report = LocalDeviceCollector(context).collect()
    assertEquals(context.packageManager.hasSystemFeature(PackageManager.FEATURE_USB_HOST), report["usbHostSupported"])
    assertEquals(before, report["usbDeviceCount"])
  }

  @Test
  fun restrictedIdentifiersAndGrantedRootAreNeverPartOfCollection() {
    val report = LocalDeviceCollector(context).collect()
    listOf("serial", "imei", "mac", "token", "password", "usbDeviceName", "rootGrant").forEach { key ->
      assertFalse("Forbidden field collected: $key", report.containsKey(key))
    }
    assertTrue(report["limitations"] is List<*>)
  }
}
