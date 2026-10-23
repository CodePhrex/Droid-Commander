package com.droidcommander.usb

import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DroidCommanderUsbHostModule : Module() {
  private var adapter: UsbHostAdapter? = null
  private var breakGlassVerifier: BreakGlassKeystoreVerifier? = null
  private var rootProvider: RootCapabilityProvider? = null

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

    AsyncFunction("getUsbDiagnostics") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      UsbInventoryCollector(context).collect()
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

    AsyncFunction("provisionBreakGlassTrustAnchor") { issuerId: String, keyId: String, certificateBase64: String ->
      breakGlass().provisionTrustAnchor(issuerId, keyId, certificateBase64)
    }

    AsyncFunction("verifyBreakGlassSignature") { payload: String, signatureBase64: String, issuerId: String, keyId: String ->
      breakGlass().verifyBreakGlassSignature(payload, signatureBase64, issuerId, keyId)
    }

    AsyncFunction("provisionBreakGlassCredential") { credentialJson: String ->
      breakGlass().provisionBreakGlassCredential(credentialJson)
    }

    AsyncFunction("hasProvisionedBreakGlassCredential") {
      breakGlass().hasProvisionedBreakGlassCredential()
    }

    AsyncFunction("clearProvisionedBreakGlassCredential") {
      breakGlassVerifier?.clearProvisionedBreakGlassCredential()
    }

    AsyncFunction("detectRoot") {
      root().detect()
    }

    AsyncFunction("requestRootSession") { sessionId: String, targetId: String, scopes: List<String>, durationSeconds: Int ->
      root().requestScopedSession(sessionId, targetId, scopes, durationSeconds)
        ?: mapOf("granted" to false, "reason" to "Root manager denied or unavailable.")
    }

    AsyncFunction("executeApprovedRootOperation") { sessionId: String, operationId: String, parameters: Map<String, String> ->
      root().executeApprovedOperation(sessionId, operationId, parameters)
    }

    AsyncFunction("closeRootSession") { sessionId: String ->
      root().closeSession(sessionId)
    }

    AsyncFunction("collectBootState") {
      val context = appContext.reactContext ?: error("React context unavailable")
      BootStateCollector(context).collect()
    }

    AsyncFunction("collectLocalDeviceState") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      LocalDeviceCollector(context).collect()
    }

    AsyncFunction("collectDebugState") {
      val context = appContext.reactContext ?: error("React context unavailable")
      mapOf(
        "developerOptionsEnabled" to (Settings.Global.getInt(context.contentResolver, "development_settings_enabled", 0) == 1),
        "adbEnabled" to (Settings.Global.getInt(context.contentResolver, "adb_enabled", 0) == 1),
        "oemUnlockAllowed" to (Settings.Global.getString(context.contentResolver, "oem_unlock_allowed") ?: ""),
        "debuggableBuild" to (Build.TYPE == "eng" || Build.TYPE == "userdebug"),
        "readOnly" to true,
      )
    }

    AsyncFunction("openDeveloperOptions") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      activity.startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS))
      true
    }

    OnDestroy {
      adapter?.close()
      adapter = null
      breakGlassVerifier = null
      rootProvider = null
    }
  }

  private fun breakGlass(): BreakGlassKeystoreVerifier {
    return breakGlassVerifier ?: BreakGlassKeystoreVerifier(appContext.reactContext ?: error("React context unavailable")).also {
      breakGlassVerifier = it
    }
  }

  private fun root(): RootCapabilityProvider {
    return rootProvider ?: RootCapabilityProvider().also { rootProvider = it }
  }
}
