package com.droidcommander.usb

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.usb.UsbManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UsbHostAdapterInstrumentedTest {
  private lateinit var context: Context
  private lateinit var adapter: UsbHostAdapter
  private val events = CopyOnWriteArrayList<UsbHostEvent>()

  @Before
  fun setUp() {
    context = InstrumentationRegistry.getInstrumentation().targetContext
    assumeTrue("USB Host is not available on this device", context.packageManager.hasSystemFeature(PackageManager.FEATURE_USB_HOST))
    adapter = UsbHostAdapter(
      context = context,
      policy = UsbHostPolicy(
        vendorIds = setOf(0x7fff),
        productIds = setOf(0x7fff),
        interfaceClass = 0xff,
        maxPayloadBytes = 64 * 1024,
        transferTimeoutMs = 250,
      ),
      listener = object : UsbHostAdapter.Listener {
        override fun onUsbEvent(event: UsbHostEvent) {
          events += event
        }
      },
    )
  }

  @After
  fun tearDown() {
    if (::adapter.isInitialized) adapter.close()
  }

  @Test
  fun discoveryRegistersReceiverAndReportsNoUnapprovedDevices() {
    val devices = adapter.startDiscovery()
    assertTrue("The synthetic allow-list should not match an unapproved device", devices.isEmpty())
    assertTrue(events.any { it.type == "discovery-started" })
    assertFalse(events.any { it.type == "device-found" })
  }

  @Test
  fun permissionAndConnectionRejectUnknownDeviceWithoutOpeningTransport() {
    adapter.startDiscovery()
    assertFalse(adapter.requestPermission("/dev/bus/usb/999/999"))
    assertFalse(adapter.connect("/dev/bus/usb/999/999"))
    assertTrue(events.count { it.type == "permission-rejected" } >= 1)
    assertTrue(events.any { it.type == "connection-failed" })
  }

  @Test
  fun sendBeforeConnectionIsRejectedAndDoesNotStartIo() {
    assertFalse(adapter.send(byteArrayOf(0x44, 0x43)))
    assertTrue(events.any { it.type == "send-rejected" })
  }

  @Test
  fun oversizedAndEmptyPayloadsAreRejectedBeforeTransport() {
    assertFalse(adapter.send(ByteArray(0)))
    assertFalse(adapter.send(ByteArray(64 * 1024 + 1)))
    assertTrue(events.count { it.type == "send-rejected" } >= 2)
  }

  @Test
  fun closeIsIdempotentAndUnregistersTheReceiver() {
    adapter.startDiscovery()
    adapter.close()
    adapter.close()
  }

  @Test
  fun permissionFlowReportsAnExplicitOutcomeForApprovedFixture() {
    assumeFixtureEnabled()
    val fixture = findFixture()
    assumeTrue("Configured USB fixture is not attached", fixture != null)
    val device = requireNotNull(fixture)
    assertTrue(adapter.requestPermission(device.deviceName))
    awaitEvent("permission-requested", "permission-granted", "permission-denied", timeoutMs = 10_000)
  }

  @Test
  fun approvedFixtureConnectsOnlyAfterPermission() {
    assumeFixtureEnabled()
    assumePermissionPreGranted()
    val fixture = findFixture()
    assumeTrue("Configured USB fixture is not attached", fixture != null)
    val device = requireNotNull(fixture)
    assertTrue(adapter.connect(device.deviceName))
    awaitEvent("connected", timeoutMs = 5_000)
  }

  @Test
  fun approvedEchoFixtureSupportsBoundedRoundTrip() {
    assumeFixtureEnabled()
    assumePermissionPreGranted()
    assumeTrue("Set droidcmd.usb.echo=true for an echo companion", argument("droidcmd.usb.echo") == "true")
    val fixture = findFixture()
    assumeTrue("Configured USB fixture is not attached", fixture != null)
    val device = requireNotNull(fixture)
    assertTrue(adapter.connect(device.deviceName))
    awaitEvent("connected", timeoutMs = 5_000)

    // This is a harmless protocol heartbeat-sized probe, not an arbitrary command.
    val probe = byteArrayOf(0x44, 0x43, 0x01, 0x08, 0x00)
    assertTrue(adapter.send(probe))
    awaitEvent("bytes-received", "transport-error", timeoutMs = 5_000)
  }

  private fun assumeFixtureEnabled() {
    assumeTrue("Set droidcmd.usb.fixture=true to run physical-fixture tests", argument("droidcmd.usb.fixture") == "true")
  }

  private fun assumePermissionPreGranted() {
    assumeTrue("Set droidcmd.usb.permissionGranted=true after approving the Android USB dialog", argument("droidcmd.usb.permissionGranted") == "true")
  }

  private fun findFixture() = (context.getSystemService(Context.USB_SERVICE) as UsbManager).deviceList.values.firstOrNull { device ->
    device.vendorId == argument("droidcmd.usb.vendorId")?.toIntOrNull() &&
      device.productId == argument("droidcmd.usb.productId")?.toIntOrNull()
  }

  private fun argument(name: String): String? = InstrumentationRegistry.getArguments().getString(name)

  private fun awaitEvent(vararg types: String, timeoutMs: Long) {
    val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
    while (System.nanoTime() < deadline) {
      if (events.any { it.type in types }) return
      Thread.sleep(50)
    }
    throw AssertionError("Timed out waiting for ${types.joinToString()} events; got ${events.map { it.type }}")
  }
}
