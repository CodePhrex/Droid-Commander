package com.droidcommander.nativemodule.fastboot

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

/**
 * Low-Level ADB/Fastboot Diagnostic Transport Layer
 * File: fastboot-diagnostic-module.kt
 *
 * Facilitates low-level recovery state telemetry and fastboot diagnostic command execution
 * over USB OTG. Requires explicit cryptographic signature verification on OEM payload commands
 * before transmission to prevent unauthorized bootloader modifications.
 */
class FastbootDiagnosticModule(
    private val usbManager: UsbManager,
    private val trustedSignerPublicKeyPem: String
) {

    companion object {
        private const val FASTBOOT_INTERFACE_CLASS = 0xFF
        private const val FASTBOOT_INTERFACE_SUBCLASS = 0x42
        private const val FASTBOOT_INTERFACE_PROTOCOL = 0x03
        private const val COMMAND_TIMEOUT_MS = 5000
        private const val MAX_PACKET_SIZE = 4096
    }

    private var usbConnection: UsbDeviceConnection? = null
    private var inEndpoint: UsbEndpoint? = null
    private var outEndpoint: UsbEndpoint? = null
    private var fastbootInterface: UsbInterface? = null
    private var isConnected: Boolean = false

    /**
     * Discovers and binds to a connected Android fastboot/bootloader device over USB OTG.
     */
    fun connectToFastbootDevice(device: UsbDevice): Boolean {
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            if (iface.interfaceClass == FASTBOOT_INTERFACE_CLASS &&
                iface.interfaceSubClass == FASTBOOT_INTERFACE_SUBCLASS &&
                iface.interfaceProtocol == FASTBOOT_INTERFACE_PROTOCOL) {

                val connection = usbManager.openDevice(device) ?: return false
                if (!connection.claimInterface(iface, true)) {
                    connection.close()
                    return false
                }

                var epIn: UsbEndpoint? = null
                var epOut: UsbEndpoint? = null

                for (j in 0 until iface.endpointCount) {
                    val ep = iface.getEndpoint(j)
                    if (ep.direction == android.hardware.usb.UsbConstants.USB_DIR_IN) {
                        epIn = ep
                    } else if (ep.direction == android.hardware.usb.UsbConstants.USB_DIR_OUT) {
                        epOut = ep
                    }
                }

                if (epIn != null && epOut != null) {
                    this.usbConnection = connection
                    this.fastbootInterface = iface
                    this.inEndpoint = epIn
                    this.outEndpoint = epOut
                    this.isConnected = true
                    return true
                } else {
                    connection.releaseInterface(iface)
                    connection.close()
                }
            }
        }
        return false
    }

    /**
     * Executes a signed diagnostic fastboot command.
     * Enforces signature gate to verify command payload before transmitting over USB.
     */
    fun sendSignedFastbootCommand(
        commandString: String,
        signatureBase64: String
    ): FastbootResponse {
        if (!isConnected || usbConnection == null || outEndpoint == null || inEndpoint == null) {
            return FastbootResponse(false, "FAIL: USB fastboot interface not connected or released.")
        }

        // Gate: Verify cryptographic signature on command
        if (!verifyCommandSignature(commandString, signatureBase64)) {
            disconnect() // Fail-closed on signature violation
            return FastbootResponse(false, "FAIL: Command signature verification failed. USB channel disconnected.")
        }

        val rawCmdBytes = commandString.toByteArray(Charsets.US_ASCII)
        val sentBytes = usbConnection!!.bulkTransfer(outEndpoint, rawCmdBytes, rawCmdBytes.size, COMMAND_TIMEOUT_MS)

        if (sentBytes != rawCmdBytes.size) {
            return FastbootResponse(false, "FAIL: Short write during bulk transfer ($sentBytes / ${rawCmdBytes.size} bytes).")
        }

        // Read Fastboot response (4-byte status prefix + data)
        val responseBuffer = ByteArray(MAX_PACKET_SIZE)
        val readBytes = usbConnection!!.bulkTransfer(inEndpoint, responseBuffer, responseBuffer.size, COMMAND_TIMEOUT_MS)

        if (readBytes < 4) {
            return FastbootResponse(false, "FAIL: Invalid fastboot status response length ($readBytes bytes).")
        }

        val responseStr = String(responseBuffer, 0, readBytes, Charsets.US_ASCII)
        val prefix = responseStr.substring(0, 4)
        val payload = responseStr.substring(4)

        return when (prefix) {
            "OKAY" -> FastbootResponse(true, payload)
            "FAIL" -> FastbootResponse(false, payload)
            "INFO" -> FastbootResponse(true, "[INFO] $payload")
            "DATA" -> FastbootResponse(true, "[DATA_PENDING] Length: $payload")
            else -> FastbootResponse(false, "UNKNOWN_PREFIX: $responseStr")
        }
    }

    /**
     * Verifies ECDSA P-256 signature for incoming fastboot diagnostic commands.
     */
    private fun verifyCommandSignature(command: String, signatureBase64: String): Boolean {
        return try {
            val cleanPem = trustedSignerPublicKeyPem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("\\s".toRegex(), "")

            val keyBytes = Base64.getDecoder().decode(cleanPem)
            val keySpec = X509EncodedKeySpec(keyBytes)
            val keyFactory = KeyFactory.getInstance("EC")
            val publicKey: PublicKey = keyFactory.generatePublic(keySpec)

            val sig = Signature.getInstance("SHA256withECDSA")
            sig.initVerify(publicKey)
            sig.update(command.toByteArray(Charsets.UTF_8))
            val sigBytes = Base64.getDecoder().decode(signatureBase64)
            sig.verify(sigBytes)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Fail-closed termination of the USB fastboot interface connection.
     */
    fun disconnect() {
        try {
            fastbootInterface?.let { usbConnection?.releaseInterface(it) }
            usbConnection?.close()
        } catch (_: Exception) {}
        this.usbConnection = null
        this.inEndpoint = null
        this.outEndpoint = null
        this.fastbootInterface = null
        this.isConnected = false
    }

    data class FastbootResponse(
        val success: Boolean,
        val output: String
    )
}
