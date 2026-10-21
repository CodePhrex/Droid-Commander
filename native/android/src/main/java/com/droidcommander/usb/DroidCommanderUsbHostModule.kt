package com.droidcommander.usb

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Thin Expo bridge for the native UsbHostAdapter. The JavaScript layer still owns
 * authorization, protocol framing, and session state; this module only exposes
 * transport facts and bounded bytes from the Android USB Host API.
 */
class DroidCommanderUsbHostModule : Module() {
  private var adapter: UsbHostAdapter? = null

  override fun definition() = ModuleDefinition {
    Name("DroidCommanderUsbHost")
    Events("onUsbHostEvent")

    AsyncFunction("startDiscovery") { vendorIds: List<Int>, productIds: List<Int>, interfaceClass: Int ->
      val context = appContext.reactContext ?: error("React context unavailable")
      adapter?.close()
      adapter = UsbHostAdapter(
        context = context,
        policy = UsbHostPolicy(
          vendorIds = vendorIds.toSet(),
          productIds = productIds.toSet(),
          interfaceClass = interfaceClass,
        ),
        listener = object : UsbHostAdapter.Listener {
          override fun onUsbEvent(event: UsbHostEvent) {
            sendEvent("onUsbHostEvent", mapOf("type" to event.type, "payload" to event.payload))
          }
        },
      )
      adapter!!.startDiscovery().map { descriptor ->
        mapOf(
          "deviceName" to descriptor.deviceName,
          "deviceId" to descriptor.deviceId,
          "vendorId" to descriptor.vendorId,
          "productId" to descriptor.productId,
          "deviceClass" to descriptor.deviceClass,
          "interfaceCount" to descriptor.interfaceCount,
          "permissionGranted" to descriptor.permissionGranted,
        )
      }
    }

    AsyncFunction("requestPermission") { deviceName: String ->
      adapter?.requestPermission(deviceName) ?: false
    }

    AsyncFunction("connect") { deviceName: String ->
      adapter?.connect(deviceName) ?: false
    }

    AsyncFunction("send") { bytes: ByteArray ->
      adapter?.send(bytes) ?: false
    }

    AsyncFunction("close") {
      adapter?.close()
      adapter = null
    }

    OnDestroy {
      adapter?.close()
      adapter = null
    }
  }
}
