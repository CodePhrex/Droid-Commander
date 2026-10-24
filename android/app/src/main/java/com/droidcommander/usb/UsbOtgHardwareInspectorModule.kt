package com.droidcommander.usb

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments

class UsbOtgHardwareInspectorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "UsbOtgHardwareInspector"
    }

    @ReactMethod
    fun enumerateConnectedHostDevices(promise: Promise) {
        try {
            val usbManager = reactApplicationContext.getSystemService(Context.USB_SERVICE) as UsbManager
            val deviceList = usbManager.deviceList
            val resultList = Arguments.createArray()

            for ((_, device) in deviceList) {
                val map = Arguments.createMap()
                map.putString("deviceName", device.deviceName)
                map.putInt("vendorId", device.vendorId)
                map.putInt("productId", device.productId)
                map.putInt("deviceClass", device.deviceClass)
                map.putInt("deviceSubClass", device.deviceSubclass)
                map.putInt("interfaceCount", device.interfaceCount)
                resultList.pushMap(map)
            }

            promise.resolve(resultList)
        } catch (e: Exception) {
            promise.reject("USB_ENUMERATION_ERROR", e.message, e)
        }
    }
}
