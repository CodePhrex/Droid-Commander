package com.droidcommander.usb

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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

    AsyncFunction("sendBase64") { bytesBase64: String ->
      val bytes = try {
        Base64.decode(bytesBase64, Base64.DEFAULT)
      } catch (_: IllegalArgumentException) {
        return@AsyncFunction false
      }
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
