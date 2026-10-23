package com.droidcommander.usb

import android.content.Context
import android.content.pm.PackageManager
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager

/**
 * Read-only USB Host inventory for troubleshooting restrictive discovery policies.
 * It never opens a device, claims an interface, or requests USB permission.
 */
class UsbInventoryCollector(private val context: Context) {
  fun collect(): Map<String, Any?> {
    val inventory = inventorySnapshot()
    return mapOf(
      "featureUsbHost" to safe {
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_USB_HOST)
      },
      "rawCount" to inventory?.devices?.size,
      "devices" to inventory?.let { snapshot ->
        safe { snapshot.devices.map { device -> descriptor(device, snapshot.usbManager) } }
      },
      "readOnly" to true,
      "limitations" to limitations,
    )
  }

  private fun inventorySnapshot(): InventorySnapshot? = safe {
    val usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager
      ?: return@safe null
    // This intentionally reads every attached device before any configured allow-list is applied.
    InventorySnapshot(usbManager, usbManager.deviceList.values.toList())
  }

  private fun descriptor(device: UsbDevice, usbManager: UsbManager): Map<String, Any> {
    val interfaces = (0 until device.interfaceCount).map { device.getInterface(it) }
    val bulkInputAvailable = interfaces.any { usbInterface ->
      (0 until usbInterface.endpointCount).any { endpointIndex ->
        val endpoint = usbInterface.getEndpoint(endpointIndex)
        endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK && endpoint.direction == UsbConstants.USB_DIR_IN
      }
    }
    val bulkOutputAvailable = interfaces.any { usbInterface ->
      (0 until usbInterface.endpointCount).any { endpointIndex ->
        val endpoint = usbInterface.getEndpoint(endpointIndex)
        endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK && endpoint.direction == UsbConstants.USB_DIR_OUT
      }
    }
    val bulkInOutPairAvailable = interfaces.any { usbInterface ->
      var hasInput = false
      var hasOutput = false
      for (endpointIndex in 0 until usbInterface.endpointCount) {
        val endpoint = usbInterface.getEndpoint(endpointIndex)
        if (endpoint.type != UsbConstants.USB_ENDPOINT_XFER_BULK) continue
        if (endpoint.direction == UsbConstants.USB_DIR_IN) hasInput = true
        if (endpoint.direction == UsbConstants.USB_DIR_OUT) hasOutput = true
      }
      hasInput && hasOutput
    }

    return mapOf(
      // Android assigns this integer only while the USB device is attached. It is not a serial number.
      "deviceId" to device.deviceId,
      "vendorId" to device.vendorId,
      "productId" to device.productId,
      "deviceClass" to device.deviceClass,
      "interfaceClasses" to interfaces.map { usbInterface -> usbInterface.interfaceClass },
      "bulkEndpoints" to mapOf(
        "inputAvailable" to bulkInputAvailable,
        "outputAvailable" to bulkOutputAvailable,
        "inOutPairAvailable" to bulkInOutPairAvailable,
      ),
      "permissionGranted" to usbManager.hasPermission(device),
    )
  }

  private inline fun <T> safe(read: () -> T): T? = try {
    read()
  } catch (_: Exception) {
    null
  }

  private data class InventorySnapshot(
    val usbManager: UsbManager,
    val devices: List<UsbDevice>,
  )

  private companion object {
    val limitations = listOf(
      "Read-only USB inventory only; no device is opened, no interface is claimed, and no USB permission is requested.",
      "Inventory is intentionally unfiltered so restrictive organization profiles can be diagnosed separately from attached hardware.",
      "Diagnostic entries contain only Android's ephemeral device ID, USB class values, endpoint capability, and current permission state; names, paths, serials, and product strings are omitted.",
      "A null host-feature, count, or device list means the relevant platform value was unavailable to read; it does not mean no USB hardware is attached.",
    )
  }
}
