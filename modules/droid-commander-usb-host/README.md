# expo-droid-commander-usb-host

Local Expo module for the Droid Commander cooperative Android USB Host transport.

The module exposes discovery, permission request, connection, base64 bridge send, native event subscription, and close. It only connects to devices that match the configured vendor/product/interface allow-list and have a bulk IN/OUT pair. It does not implement ADB, arbitrary commands, exploit payloads, or session authorization; those remain in the shared policy and protocol layers.

This module requires an Expo development build or a prebuilt Android project. Expo Go cannot load this custom native module.
