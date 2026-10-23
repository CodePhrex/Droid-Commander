package com.droidcommander.usbhost

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
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean
import java.util.zip.CRC32

/**
 * DroidCommanderUsbHostModule
 * Native Kotlin USB OTG Host Module for Expo / React Native.
 * Manages USB OTG session handshakes, fail-closed packet wire formats,
 * hardware security checks, and break-glass emergency overrides.
 */
class DroidCommanderUsbHostModule : Module() {

    private val context: Context
        get() = requireNotNull(appContext.reactContext) { "React Application Context is unavailable" }

    private val usbManager: UsbManager by lazy {
        context.getSystemService(Context.USB_SERVICE) as UsbManager
    }

    private var activeDevice: UsbDevice? = null
    private var activeConnection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var endpointIn: UsbEndpoint? = null
    private var endpointOut: UsbEndpoint? = null

    private val ioScope = CoroutineScope(Dispatchers.IO + Job())
    private val isSessionActive = AtomicBoolean(false)
    private var currentSessionState = SessionState.DISCONNECTED
    private var activeBreakGlassScope: Set<String> = emptySet()

    enum class SessionState {
        DISCONNECTED,
        HANDSHAKE_PENDING,
        AUTHENTICATED_SESSION,
        OVERRIDDEN_EMERGENCY,
        FAIL_CLOSED_LOCKOUT
    }

    companion object {
        private const val TAG = "DroidCmdUSBHost"
        private const val ACTION_USB_PERMISSION = "com.droidcommander.usbhost.USB_PERMISSION"
        private const val PROTOCOL_MAGIC: Short = 0x4443 // "DC" (Droid Commander)
        private const val MAX_PACKET_SIZE = 4096
        private const val TIMEOUT_MS = 2000
    }

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }

                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let { initializeUsbSession(it) }
                        } else {
                            Log.w(TAG, "USB permission denied for device: ${device?.deviceName}")
                            setSessionState(SessionState.FAIL_CLOSED_LOCKOUT)
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    Log.i(TAG, "USB Device detached. Reverting to fail-closed state.")
                    closeSession()
                }
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("DroidCommanderUsbHost")

        Events("onUsbEvent", "onSessionStateChanged", "onPacketReceived")

        OnCreate {
            val filter = IntentFilter().apply {
                addAction(ACTION_USB_PERMISSION)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(usbReceiver, filter)
            }
        }

        OnDestroy {
            try {
                context.unregisterReceiver(usbReceiver)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering USB BroadcastReceiver", e)
            }
            closeSession()
        }

        /**
         * Lists all connected USB devices eligible for OTG communication.
         */
        Function("listConnectedDevices") {
            val deviceList = usbManager.deviceList
            return@Function deviceList.values.map { device ->
                mapOf(
                    "deviceName" to device.deviceName,
                    "vendorId" to device.vendorId,
                    "productId" to device.productId,
                    "interfaceCount" to device.interfaceCount
                )
            }
        }

        /**
         * Requests USB hardware permission and initiates handshake session.
         */
        Function("requestUsbPermission") { deviceName: String ->
            val device = usbManager.deviceList[deviceName]
                ?: throw IllegalArgumentException("Device $deviceName not found.")

            if (usbManager.hasPermission(device)) {
                initializeUsbSession(device)
            } else {
                val permissionIntent = PendingIntent.getBroadcast(
                    context,
                    0,
                    Intent(ACTION_USB_PERMISSION),
                    PendingIntent.FLAG_MUTABLE
                )
                usbManager.requestPermission(device, permissionIntent)
            }
        }

        /**
         * Sets break-glass emergency override state in native code.
         */
        Function("setBreakGlassOverride") { active: Boolean, scopes: List<String> ->
            if (active) {
                activeBreakGlassScope = scopes.toSet()
                setSessionState(SessionState.OVERRIDDEN_EMERGENCY)
                Log.w(TAG, "BREAK-GLASS NATIVE OVERRIDE ACTIVATED with scopes: $scopes")
            } else {
                activeBreakGlassScope = emptySet()
                if (currentSessionState == SessionState.OVERRIDDEN_EMERGENCY) {
                    setSessionState(SessionState.AUTHENTICATED_SESSION)
                }
            }
        }

        /**
         * Sends framed packet to connected hardware device over USB endpoint.
         */
        AsyncFunction("sendFramedPacket") { commandId: Int, payload: ByteArray ->
            return@AsyncFunction withContext(Dispatchers.IO) {
                enforceExecutionGates("EXECUTE_USB_COMMAND")
                val framedPacket = buildFramedPacket(commandId.toShort(), payload)
                val bytesWritten = writeToEndpoint(framedPacket)
                return@withContext mapOf(
                    "success" to (bytesWritten == framedPacket.size),
                    "bytesSent" to bytesWritten
                )
            }
        }

        /**
         * Reads next hardware response packet from USB IN endpoint.
         */
        AsyncFunction("readPacket") { timeoutMs: Int ->
            return@AsyncFunction withContext(Dispatchers.IO) {
                val rawBuffer = ByteArray(MAX_PACKET_SIZE)
                val bytesRead = readFromEndpoint(rawBuffer, if (timeoutMs > 0) timeoutMs else TIMEOUT_MS)

                if (bytesRead <= 0) {
                    return@withContext mapOf("success" to false, "error" to "Read timeout or hardware disconnect")
                }

                val parsedPacket = parseAndVerifyPacket(rawBuffer.copyOf(bytesRead))
                return@withContext mapOf(
                    "success" to true,
                    "commandId" to parsedPacket.commandId,
                    "payload" to parsedPacket.payload,
                    "crcValid" to parsedPacket.crcValid
                )
            }
        }

        /**
         * Explicitly closes USB session and releases interface claims.
         */
        Function("closeSession") {
            closeSession()
            return@Function mapOf("status" to "DISCONNECTED")
        }
    }

    private fun initializeUsbSession(device: UsbDevice) {
        setSessionState(SessionState.HANDSHAKE_PENDING)

        val intf = (0 until device.interfaceCount)
            .map { device.getInterface(it) }
            .firstOrNull { it.interfaceClass == UsbConstants.USB_CLASS_VENDOR_SPECIFIC || it.interfaceClass == UsbConstants.USB_CLASS_COMM }
            ?: device.getInterface(0)

        val connection = usbManager.openDevice(device)
            ?: run {
                Log.e(TAG, "Failed to open USB connection to device: ${device.deviceName}")
                setSessionState(SessionState.FAIL_CLOSED_LOCKOUT)
                return
            }

        if (!connection.claimInterface(intf, true)) {
            Log.e(TAG, "Could not claim USB interface ${intf.id}")
            connection.close()
            setSessionState(SessionState.FAIL_CLOSED_LOCKOUT)
            return
        }

        var epIn: UsbEndpoint? = null
        var epOut: UsbEndpoint? = null

        for (i in 0 until intf.endpointCount) {
            val ep = intf.getEndpoint(i)
            if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                if (ep.direction == UsbConstants.USB_DIR_IN && epIn == null) epIn = ep
                if (ep.direction == UsbConstants.USB_DIR_OUT && epOut == null) epOut = ep
            }
        }

        if (epIn == null || epOut == null) {
            Log.e(TAG, "Bulk endpoints not found on USB interface.")
            connection.releaseInterface(intf)
            connection.close()
            setSessionState(SessionState.FAIL_CLOSED_LOCKOUT)
            return
        }

        this.activeDevice = device
        this.activeConnection = connection
        this.usbInterface = intf
        this.endpointIn = epIn
        this.endpointOut = epOut
        this.isSessionActive.set(true)

        if (activeBreakGlassScope.contains("BYPASS_TWO_PARTY_CONSENT") || activeBreakGlassScope.contains("*")) {
            setSessionState(SessionState.OVERRIDDEN_EMERGENCY)
        } else {
            setSessionState(SessionState.AUTHENTICATED_SESSION)
        }

        Log.i(TAG, "USB Hardware OTG Session established successfully with ${device.deviceName}")
    }

    private fun enforceExecutionGates(requiredCapability: String) {
        if (!isSessionActive.get() || activeConnection == null) {
            throw IllegalStateException("Execution blocked: No active USB hardware session.")
        }

        if (currentSessionState == SessionState.FAIL_CLOSED_LOCKOUT) {
            throw SecurityException("Execution blocked: USB Host is in FAIL_CLOSED_LOCKOUT state.")
        }

        val isOverridden = activeBreakGlassScope.contains(requiredCapability) || activeBreakGlassScope.contains("*")
        if (currentSessionState == SessionState.HANDSHAKE_PENDING && !isOverridden) {
            throw SecurityException("Execution blocked: Hardware handshake pending and no active break-glass override.")
        }
    }

    /**
     * Builds packet wire frame: [MAGIC 2B][CMD 2B][LEN 4B][PAYLOAD NB][CRC32 4B]
     */
    private fun buildFramedPacket(commandId: Short, payload: ByteArray): ByteArray {
        val payloadLen = payload.size
        val buffer = ByteBuffer.allocate(2 + 2 + 4 + payloadLen + 4).apply {
            order(ByteOrder.BIG_ENDIAN)
            putShort(PROTOCOL_MAGIC)
            putShort(commandId)
            putInt(payloadLen)
            put(payload)
        }

        // Calculate CRC32 over magic, cmd, len, and payload
        val crc = CRC32()
        crc.update(buffer.array(), 0, buffer.position())
        val crcValue = crc.value.toInt()

        buffer.putInt(crcValue)
        return buffer.array()
    }

    private data class ParsedPacket(val commandId: Int, val payload: ByteArray, val crcValid: Boolean)

    private fun parseAndVerifyPacket(rawBytes: ByteArray): ParsedPacket {
        if (rawBytes.size < 12) {
            return ParsedPacket(-1, byteArrayOf(), false)
        }

        val buffer = ByteBuffer.wrap(rawBytes).apply { order(ByteOrder.BIG_ENDIAN) }
        val magic = buffer.short
        if (magic != PROTOCOL_MAGIC) {
            Log.e(TAG, "Packet Magic Mismatch: Expected 0x4443, got 0x${Integer.toHexString(magic.toInt())}")
            return ParsedPacket(-1, byteArrayOf(), false)
        }

        val commandId = buffer.short.toInt()
        val payloadLen = buffer.int

        if (rawBytes.size < 8 + payloadLen + 4) {
            Log.e(TAG, "Truncated packet received. Expected ${8 + payloadLen + 4} bytes, got ${rawBytes.size}")
            return ParsedPacket(commandId, byteArrayOf(), false)
        }

        val payload = ByteArray(payloadLen)
        buffer.get(payload)
        val rxCrc = buffer.int

        val crcCalculator = CRC32()
        crcCalculator.update(rawBytes, 0, 8 + payloadLen)
        val calculatedCrc = crcCalculator.value.toInt()

        return ParsedPacket(commandId, payload, rxCrc == calculatedCrc)
    }

    private fun writeToEndpoint(data: ByteArray): Int {
        val conn = activeConnection ?: return -1
        val ep = endpointOut ?: return -1
        return conn.bulkTransfer(ep, data, data.size, TIMEOUT_MS)
    }

    private fun readFromEndpoint(buffer: ByteArray, timeoutMs: Int): Int {
        val conn = activeConnection ?: return -1
        val ep = endpointIn ?: return -1
        return conn.bulkTransfer(ep, buffer, buffer.size, timeoutMs)
    }

    private fun setSessionState(newState: SessionState) {
        currentSessionState = newState
        sendEvent("onSessionStateChanged", mapOf("state" to newState.name))
    }

    private fun closeSession() {
        isSessionActive.set(false)
        activeConnection?.let { conn ->
            usbInterface?.let { intf -> conn.releaseInterface(intf) }
            conn.close()
        }
        activeConnection = null
        activeDevice = null
        usbInterface = null
        endpointIn = null
        endpointOut = null
        setSessionState(SessionState.DISCONNECTED)
    }
}
