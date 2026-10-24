import { describe, it, expect, beforeEach } from "vitest";
import {
  UsbOtgHardwareInspector,
  UsbDeviceDescriptor,
  UsbInterfaceInfo,
} from "../lib/usb-otg-hardware-inspector";

describe("UsbOtgHardwareInspector - Hardware Inspection & Descriptor Security", () => {
  let inspector: UsbOtgHardwareInspector;

  beforeEach(() => {
    inspector = new UsbOtgHardwareInspector();
  });

  it("should evaluate standard High-Speed OTG Mass Storage device as SAFE", () => {
    const device: UsbDeviceDescriptor = {
      vendorId: "0x0951",
      productId: "0x1666",
      deviceClass: 0,
      deviceSubClass: 0,
      deviceProtocol: 0,
      maxPacketSize0: 64,
      manufacturerName: "Kingston",
      productName: "DataTraveler 3.0",
      serialNumber: "0014D15E8B12",
      bcdDevice: "0100",
    };

    const interfaces: UsbInterfaceInfo[] = [
      {
        interfaceId: 0,
        alternateSetting: 0,
        interfaceClass: 0x08, // Mass Storage
        interfaceSubClass: 0x06,
        interfaceProtocol: 0x50,
        endpoints: [
          { endpointNumber: 1, direction: 'IN', type: 'BULK', maxPacketSize: 512, interval: 0 },
          { endpointNumber: 2, direction: 'OUT', type: 'BULK', maxPacketSize: 512, interval: 0 },
        ],
      },
    ];

    const report = inspector.evaluateDevice(device, interfaces, 'HIGH_SPEED_480');
    expect(report).toBeDefined();
    expect(report.negotiatedSpeed).toBe('HIGH_SPEED_480');
    expect(report.securityAudit.securityRiskLevel).toBe('SAFE');
    expect(report.securityAudit.isHidSpoofingDetected).toBe(false);
  });

  it("should detect BadUSB / HID spoofing heuristic when Mass Storage exposes HID endpoint", () => {
    const compositeDevice: UsbDeviceDescriptor = {
      vendorId: "0x1E1D",
      productId: "0x0001",
      deviceClass: 0,
      deviceSubClass: 0,
      deviceProtocol: 0,
      maxPacketSize0: 64,
      manufacturerName: "Generic Flash Drive",
      productName: "USB Storage",
      serialNumber: "SN-SPOOF-01",
      bcdDevice: "0100",
    };

    const interfaces: UsbInterfaceInfo[] = [
      {
        interfaceId: 0,
        alternateSetting: 0,
        interfaceClass: 0x08, // Mass Storage
        interfaceSubClass: 0x06,
        interfaceProtocol: 0x50,
        endpoints: [
          { endpointNumber: 1, direction: 'IN', type: 'BULK', maxPacketSize: 512, interval: 0 },
        ],
      },
      {
        interfaceId: 1,
        alternateSetting: 0,
        interfaceClass: 0x03, // HID Keyboard Spoof!
        interfaceSubClass: 0x01,
        interfaceProtocol: 0x01,
        endpoints: [
          { endpointNumber: 2, direction: 'IN', type: 'INTERRUPT', maxPacketSize: 8, interval: 10 },
        ],
      },
    ];

    const report = inspector.evaluateDevice(compositeDevice, interfaces, 'HIGH_SPEED_480');
    expect(report.securityAudit.isHidSpoofingDetected).toBe(true);
    expect(report.securityAudit.securityRiskLevel).toBe('CRITICAL_THREAT');
    expect(report.securityAudit.auditFlags.some((f) => f.includes("BadUSB"))).toBe(true);
  });

  it("should detect malformed or truncated raw descriptor stream header", () => {
    const invalidBytes = new Uint8Array([0x0A, 0x01, 0x00]); // Short malformed buffer
    const report = inspector.inspectRawDescriptors(invalidBytes);

    expect(report.securityAudit.isMalformedHeader).toBe(true);
    expect(report.securityAudit.securityRiskLevel).toBe('CRITICAL_THREAT');
  });

  it("should flag power instability and VBUS over-current conditions", () => {
    const device: UsbDeviceDescriptor = {
      vendorId: "0x1234",
      productId: "0x5678",
      deviceClass: 0,
      deviceSubClass: 0,
      deviceProtocol: 0,
      maxPacketSize0: 64,
      manufacturerName: "High Power Device",
      productName: "OTG Peripheral",
      serialNumber: "SN-PWR-99",
      bcdDevice: "0100",
    };

    const interfaces: UsbInterfaceInfo[] = [];

    const report = inspector.evaluateDevice(device, interfaces, 'HIGH_SPEED_480', {
      vbusVoltageMv: 4200,
      isVbusStable: false,
      isOverCurrentTriggered: true,
    });

    expect(report.powerTelemetry.isVbusStable).toBe(false);
    expect(report.powerTelemetry.isOverCurrentTriggered).toBe(true);
    expect(report.securityAudit.securityRiskLevel).toBe('CRITICAL_THREAT');
  });

  it("should correctly report SuperSpeed (5 Gbps) negotiated speed", () => {
    const device: UsbDeviceDescriptor = {
      vendorId: "0x0BDA",
      productId: "0x8153",
      deviceClass: 0,
      deviceSubClass: 0,
      deviceProtocol: 0,
      maxPacketSize0: 9,
      manufacturerName: "Realtek",
      productName: "USB 3.0 Gigabit Ethernet",
      serialNumber: "ETH-3001",
      bcdDevice: "0300",
    };

    const interfaces: UsbInterfaceInfo[] = [];
    const report = inspector.evaluateDevice(device, interfaces, 'SUPER_SPEED_5000');

    expect(report.negotiatedSpeed).toBe('SUPER_SPEED_5000');
    expect(report.securityAudit.securityRiskLevel).toBe('SAFE');
  });
});
