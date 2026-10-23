/**
 * Droid Commander - Device Illustration & Graphic Asset Manager
 * File: device-graphics-manager.ts
 *
 * Dynamically resolves, generates, and caches high-tech vector/graphic illustrations
 * for connected target devices (Google Pixel, Samsung Galaxy, Xiaomi, Generic OTG)
 * complete with hardware damage overlays, port glowing states, and security posture badges.
 */

export type DisplayCondition = 'INTACT_OLED' | 'SHATTERED_SCREEN' | 'HEADLESS_NO_DISPLAY' | 'WATER_DAMAGED';
export type HardwareFormFactor = 'BAR_PHONE' | 'FOLDABLE' | 'TABLET' | 'HEADLESS_BOARD';

export interface DeviceIllustrationSpec {
  illustrationId: string;
  manufacturer: string;
  model: string;
  formFactor: HardwareFormFactor;
  accentColorHex: string;
  bodyColorHex: string;
  cameraLayout: 'CENTER_PUNCH' | 'LEFT_PUNCH' | 'CAMERA_VISOR' | 'MULTI_LENS_ISLAND';
  bezelThicknessPx: number;
  displayCondition: DisplayCondition;
  otgPortGlowColor: string; // e.g. #00E5FF for active USB OTG
  aspectRatio: '19.5:9' | '20:9' | '16:9' | '4:3';
  svgSchematicPath: string; // Vector outline paths
  assetImageUrl?: string;   // High-res rendered asset URL
}

export interface DeviceGraphicOptions {
  manufacturer: string;
  model: string;
  displayCondition?: DisplayCondition;
  isConnectedOtg?: boolean;
  riskScore?: number;
}

export class DeviceGraphicsManager {
  private static instance: DeviceGraphicsManager;
  private specCache: Map<string, DeviceIllustrationSpec> = new Map();

  private constructor() {}

  public static getInstance(): DeviceGraphicsManager {
    if (!DeviceGraphicsManager.instance) {
      DeviceGraphicsManager.instance = new DeviceGraphicsManager();
    }
    return DeviceGraphicsManager.instance;
  }

  /**
   * Resolves or dynamically generates an illustration specification for a target device.
   */
  public resolveDeviceIllustration(options: DeviceGraphicOptions): DeviceIllustrationSpec {
    const cacheKey = `${options.manufacturer}_${options.model}_${options.displayCondition || 'INTACT_OLED'}`;
    if (this.specCache.has(cacheKey)) {
      return this.specCache.get(cacheKey)!;
    }

    const mfg = (options.manufacturer || '').toLowerCase();
    const model = (options.model || '').toLowerCase();

    let spec: DeviceIllustrationSpec;

    if (mfg.includes('google') || model.includes('pixel')) {
      spec = {
        illustrationId: `ILLUST_PIXEL_${Date.now()}`,
        manufacturer: 'Google',
        model: options.model || 'Pixel 8 Pro',
        formFactor: 'BAR_PHONE',
        accentColorHex: '#4285F4',
        bodyColorHex: '#1E293B',
        cameraLayout: 'CAMERA_VISOR',
        bezelThicknessPx: 3,
        displayCondition: options.displayCondition || 'INTACT_OLED',
        otgPortGlowColor: options.isConnectedOtg ? '#00E5FF' : '#475569',
        aspectRatio: '20:9',
        svgSchematicPath: 'M 10 20 C 10 10, 90 10, 90 20 L 90 180 C 90 190, 10 190, 10 180 Z',
        assetImageUrl: 'pixel_8_pro_cyber_illustration.png',
      };
    } else if (mfg.includes('samsung') || model.includes('galaxy')) {
      spec = {
        illustrationId: `ILLUST_SAMSUNG_${Date.now()}`,
        manufacturer: 'Samsung',
        model: options.model || 'Galaxy S24 Ultra',
        formFactor: 'BAR_PHONE',
        accentColorHex: '#1428A0',
        bodyColorHex: '#0F172A',
        cameraLayout: 'MULTI_LENS_ISLAND',
        bezelThicknessPx: 2,
        displayCondition: options.displayCondition || 'INTACT_OLED',
        otgPortGlowColor: options.isConnectedOtg ? '#00E5FF' : '#475569',
        aspectRatio: '19.5:9',
        svgSchematicPath: 'M 5 15 C 5 5, 95 5, 95 15 L 95 185 C 95 195, 5 195, 5 185 Z',
        assetImageUrl: 'galaxy_s24_cyber_illustration.png',
      };
    } else {
      // Generic Android / OTG Target Fallback
      spec = {
        illustrationId: `ILLUST_GENERIC_${Date.now()}`,
        manufacturer: options.manufacturer || 'Generic OEM',
        model: options.model || 'AOSP OTG Target',
        formFactor: 'BAR_PHONE',
        accentColorHex: '#3DDC84', // Android Robot Green
        bodyColorHex: '#18181B',
        cameraLayout: 'CENTER_PUNCH',
        bezelThicknessPx: 4,
        displayCondition: options.displayCondition || 'INTACT_OLED',
        otgPortGlowColor: options.isConnectedOtg ? '#00E5FF' : '#475569',
        aspectRatio: '20:9',
        svgSchematicPath: 'M 12 24 C 12 12, 88 12, 88 24 L 88 176 C 88 188, 12 188, 12 176 Z',
        assetImageUrl: 'generic_otg_target_illustration.png',
      };
    }

    this.specCache.set(cacheKey, spec);
    return spec;
  }

  /**
   * Generates a high-tech SVG markup string representing the device illustration.
   */
  public renderSvgIllustrationMarkup(spec: DeviceIllustrationSpec, width: number = 160, height: number = 280): string {
    const isShattered = spec.displayCondition === 'SHATTERED_SCREEN';
    const isWaterDamaged = spec.displayCondition === 'WATER_DAMAGED';
    const isHeadless = spec.displayCondition === 'HEADLESS_NO_DISPLAY';

    const screenFill = isHeadless
      ? '#090D16'
      : isWaterDamaged
      ? '#0F2027'
      : isShattered
      ? '#111827'
      : '#020617';

    const glowColor = spec.otgPortGlowColor;

    return `
<svg width="${width}" height="${height}" viewBox="0 0 160 280" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer Chassis Shadow & OTG Ambient Glow -->
  <rect x="18" y="18" width="124" height="244" rx="20" fill="${spec.bodyColorHex}" stroke="${glowColor}" stroke-width="2.5" filter="drop-shadow(0px 0px 12px ${glowColor}88)"/>

  <!-- Screen Bezel -->
  <rect x="24" y="24" width="112" height="232" rx="16" fill="${screenFill}" stroke="${spec.accentColorHex}" stroke-width="1.5"/>

  <!-- Camera Cutout / Visor -->
  ${
    spec.cameraLayout === 'CAMERA_VISOR'
      ? `<rect x="28" y="38" width="104" height="18" rx="9" fill="#020617" stroke="#334155" stroke-width="1"/>
         <circle cx="50" cy="47" r="4" fill="#00E5FF"/>
         <circle cx="68" cy="47" r="4" fill="#3B82F6"/>`
      : `<circle cx="80" cy="36" r="4" fill="#020617" stroke="#334155" stroke-width="1"/>`
  }

  <!-- Display State Overlays -->
  ${
    isShattered
      ? `<path d="M 40 50 L 90 140 L 120 110 M 90 140 L 60 220 M 90 140 L 130 180" stroke="#EF4444" stroke-width="1.2" stroke-dasharray="3,3"/>`
      : ''
  }
  ${
    isWaterDamaged
      ? `<path d="M 30 180 Q 60 160, 90 190 T 130 170 L 130 250 L 30 250 Z" fill="#0284C7" opacity="0.35"/>`
      : ''
  }

  <!-- Tech Grid / Telemetry Lines -->
  <line x1="30" y1="90" x2="130" y2="90" stroke="#1E293B" stroke-width="1"/>
  <line x1="30" y1="130" x2="130" y2="130" stroke="#1E293B" stroke-width="1"/>
  <line x1="30" y1="170" x2="130" y2="170" stroke="#1E293B" stroke-width="1"/>

  <!-- USB OTG Port & Active Status Pulse Indicator -->
  <rect x="68" y="260" width="24" height="6" rx="3" fill="${glowColor}"/>
  <circle cx="80" cy="245" r="3" fill="${glowColor}">
    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>
  </circle>

  <!-- Model Badge Text -->
  <text x="80" y="215" text-anchor="middle" fill="#94A3B8" font-size="9" font-family="monospace" font-weight="bold">${spec.manufacturer.toUpperCase()} ${spec.model.toUpperCase()}</text>
</svg>
    `.trim();
  }
}
