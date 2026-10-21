package com.droidcommander.usb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future

/**
 * Narrow Android USB Host boundary for the cooperative Droid Commander protocol.
 *
 * This class only discovers explicitly allow-listed devices, requests the Android
 * user permission dialog, selects a bulk IN/OUT pair from an allow-listed interface,
 * and exposes bounded byte I/O. It does not speak ADB, execute commands, or infer
 * authorization from a cable connection.
 */
class UsbHostAdapter(
  context: Context,
  private val policy: UsbHostPolicy,
  private val listener: Listener,
) : AutoCloseable {
  interface Listener {
    fun onUsbEvent(event: UsbHostEvent)
  }

  private val appContext = context.applicationContext
  private val usbManager = appContext.getSystemService(Context.USB_SERVICE) as UsbManager
  private val ioExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private var readerTask: Future<*>? = null
  private var receiverRegistered = false
  private var activeDevice: UsbDevice? = null
  private var activeConnection: UsbDeviceConnection? = null
  private var activeInterface: UsbInterface? = null
  private var inputEndpoint: UsbEndpoint? = null
  private var outputEndpoint: UsbEndpoint? = null

  private val permissionAction = "${appContext.packageName}.USB_HOST_PERMISSION"

  private val usbReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      when (intent.action) {
        UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
          getDevice(intent)?.let { device ->
            if (isAllowed(device)) emit("device-attached", descriptor(device))
          }
        }
        UsbManager.ACTION_USB_DEVICE_DETACHED -> {
          getDevice(intent)?.let { device ->
            emit("device-detached", descriptor(device))
            if (activeDevice?.deviceName == device.deviceName) closeConnection("device-detached")
          }
        }
        permissionAction -> {
          val device = getDevice(intent)
          val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
          if (device == null || !isAllowed(device)) {
            emit("permission-rejected", mapOf("reason" to "device-not-allow-listed"))
          } else if (granted) {
            emit("permission-granted", descriptor(device))
          } else {
            emit("permission-denied", descriptor(device))
          }
        }
      }
    }
  }

  fun startDiscovery(): List<UsbDeviceDescriptor> {
    registerReceiverIfNeeded()
    val devices = usbManager.deviceList.values
      .filter(::isAllowed)
      .map(::descriptor)
    emit("discovery-started", mapOf("count" to devices.size))
    devices.forEach { emit("device-found", it) }
    return devices
  }

  fun requestPermission(deviceName: String): Boolean {
    val device = usbManager.deviceList[deviceName]
    if (device == null || !isAllowed(device)) {
      emit("permission-rejected", mapOf("reason" to "device-not-allow-listed", "deviceName" to deviceName))
      return false
    }
    if (usbManager.hasPermission(device)) {
      emit("permission-granted", descriptor(device))
      return true
    }
    val permissionIntent = PendingIntent.getBroadcast(
      appContext,
      device.deviceId,
      Intent(permissionAction).setPackage(appContext.packageName),
      PendingIntent.FLAG_IMMUTABLE,
    )
    usbManager.requestPermission(device, permissionIntent)
    emit("permission-requested", descriptor(device))
    return true
  }

  fun connect(deviceName: String): Boolean {
    val device = usbManager.deviceList[deviceName]
    if (device == null || !isAllowed(device)) {
      emit("connection-failed", mapOf("reason" to "device-not-allow-listed", "deviceName" to deviceName))
      return false
    }
    if (!usbManager.hasPermission(device)) {
      emit("connection-failed", mapOf("reason" to "permission-required", "deviceName" to deviceName))
      return false
    }

    val candidate = findBulkInterface(device)
    if (candidate == null) {
      emit("connection-failed", mapOf("reason" to "cooperative-interface-not-found", "deviceName" to deviceName))
      return false
    }

    closeConnection("replaced-by-new-connection")
    val connection = usbManager.openDevice(device)
    if (connection == null || !connection.claimInterface(candidate.first, true)) {
      connection?.close()
      emit("connection-failed", mapOf("reason" to "open-or-claim-failed", "deviceName" to deviceName))
      return false
    }

    activeDevice = device
    activeConnection = connection
    activeInterface = candidate.first
    inputEndpoint = candidate.second
    outputEndpoint = candidate.third
    emit("connected", mapOf("device" to descriptor(device), "interfaceId" to candidate.first.id))
    startReader()
    return true
  }

  fun send(bytes: ByteArray): Boolean {
    if (bytes.isEmpty() || bytes.size > policy.maxPayloadBytes) {
      emit("send-rejected", mapOf("reason" to "payload-size", "maxPayloadBytes" to policy.maxPayloadBytes))
      return false
    }
    val connection = activeConnection
    val endpoint = outputEndpoint
    if (connection == null || endpoint == null) {
      emit("send-rejected", mapOf("reason" to "not-connected"))
      return false
    }
    ioExecutor.execute {
      val written = connection.bulkTransfer(endpoint, bytes, bytes.size, policy.transferTimeoutMs)
      if (written != bytes.size) {
        emit("transport-error", mapOf("reason" to "short-write", "written" to written))
        closeConnection("short-write")
      }
    }
    return true
  }

  override fun close() {
    closeConnection("adapter-closed")
    if (receiverRegistered) {
      appContext.unregisterReceiver(usbReceiver)
      receiverRegistered = false
    }
    ioExecutor.shutdownNow()
  }

  private fun startReader() {
    val connection = activeConnection ?: return
    val endpoint = inputEndpoint ?: return
    readerTask?.cancel(true)
    readerTask = ioExecutor.submit {
      val buffer = ByteArray(policy.maxPayloadBytes)
      while (!Thread.currentThread().isInterrupted && connection === activeConnection) {
        val count = connection.bulkTransfer(endpoint, buffer, buffer.size, policy.transferTimeoutMs)
        when {
          count > 0 -> emit("bytes-received", mapOf("bytes" to buffer.copyOf(count)))
          count < 0 -> {
            emit("transport-error", mapOf("reason" to "read-failed", "code" to count))
            closeConnection("read-failed")
            return@submit
          }
        }
      }
    }
  }

  private fun closeConnection(reason: String) {
    readerTask?.cancel(true)
    readerTask = null
    activeConnection?.let { connection ->
      activeInterface?.let { connection.releaseInterface(it) }
      connection.close()
    }
    val hadConnection = activeDevice != null
    activeDevice = null
    activeConnection = null
    activeInterface = null
    inputEndpoint = null
    outputEndpoint = null
    if (hadConnection) emit("disconnected", mapOf("reason" to reason))
  }

  private fun registerReceiverIfNeeded() {
    if (receiverRegistered) return
    val filter = IntentFilter().apply {
      addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
      addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
      addAction(permissionAction)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      appContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      appContext.registerReceiver(usbReceiver, filter)
    }
    receiverRegistered = true
  }

  private fun isAllowed(device: UsbDevice): Boolean {
    val vendorAllowed = policy.vendorIds.isEmpty() || policy.vendorIds.contains(device.vendorId)
    val productAllowed = policy.productIds.isEmpty() || policy.productIds.contains(device.productId)
    return vendorAllowed && productAllowed && findBulkInterface(device) != null
  }

  private fun findBulkInterface(device: UsbDevice): Triple<UsbInterface, UsbEndpoint, UsbEndpoint>? {
    for (index in 0 until device.interfaceCount) {
      val usbInterface = device.getInterface(index)
      if (usbInterface.interfaceClass != policy.interfaceClass ||
        (policy.interfaceSubclass != null && usbInterface.interfaceSubclass != policy.interfaceSubclass) ||
        (policy.interfaceProtocol != null && usbInterface.interfaceProtocol != policy.interfaceProtocol)
      ) continue

      var input: UsbEndpoint? = null
      var output: UsbEndpoint? = null
      for (endpointIndex in 0 until usbInterface.endpointCount) {
        val endpoint = usbInterface.getEndpoint(endpointIndex)
        if (endpoint.type != UsbConstants.USB_ENDPOINT_XFER_BULK) continue
        if (endpoint.direction == UsbConstants.USB_DIR_IN) input = endpoint
        if (endpoint.direction == UsbConstants.USB_DIR_OUT) output = endpoint
      }
      if (input != null && output != null) return Triple(usbInterface, input, output)
    }
    return null
  }

  private fun descriptor(device: UsbDevice) = UsbDeviceDescriptor(
    deviceName = device.deviceName,
    deviceId = device.deviceId,
    vendorId = device.vendorId,
    productId = device.productId,
    deviceClass = device.deviceClass,
    interfaceCount = device.interfaceCount,
    permissionGranted = usbManager.hasPermission(device),
  )

  private fun emit(type: String, payload: Any?) {
    listener.onUsbEvent(UsbHostEvent(type, payload))
  }

  @Suppress("DEPRECATION")
  private fun getDevice(intent: Intent): UsbDevice? = if (Build.VERSION.SDK_INT >= 33) {
    intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
  } else {
    intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
  }
}

data class UsbHostPolicy(
  val vendorIds: Set<Int>,
  val productIds: Set<Int>,
  val interfaceClass: Int,
  val interfaceSubclass: Int? = null,
  val interfaceProtocol: Int? = null,
  val maxPayloadBytes: Int = 64 * 1024,
  val transferTimeoutMs: Int = 2_000,
)

data class UsbDeviceDescriptor(
  val deviceName: String,
  val deviceId: Int,
  val vendorId: Int,
  val productId: Int,
  val deviceClass: Int,
  val interfaceCount: Int,
  val permissionGranted: Boolean,
)

data class UsbHostEvent(val type: String, val payload: Any?)
