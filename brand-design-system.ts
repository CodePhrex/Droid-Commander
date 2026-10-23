/**
 * Droid Commander - Unified Brand Design System & Visual Tokens
 * Derived from official CodePhrex logo assets & icon specification sheet (1000001971.jpg, 1000001972.jpg)
 */

export const BRAND_IDENTITY = {
  appName: 'Droid Commander',
  developer: 'CodePhrex',
  monogram: 'DC',
  badgeMonogram: 'CP',
  tagline: 'Offline-First Security & Diagnostic Orchestration Platform',
  version: 'v1.0.0-RELEASE',
} as const;

export const COLOR_PALETTE = {
  // Backgrounds & Surface Textures
  background: {
    darkSlate: '#0D1117',      // Primary brushed metal background
    charcoalSurface: '#161B22',// Card and tile container surface
    elevatedSurface: '#21262D',// Modal / Floating dialog surface
    borderOutline: '#30363D',  // High-contrast bevel border
  },

  // Cyber Metallic Primary & Secondary Accents
  accent: {
    cyberCyan: '#58A6FF',     // Circuit trace glow & active states
    electricBlue: '#388BFD',  // Action buttons & primary highlights
    codePhrexIndigo: '#2A3B5C',// Deep metallic indigo (from CodePhrex branding)
    metallicSteel: '#8B949E', // Subtitle text & muted labels
    chromeSilver: '#F0F6FC',   // High-emphasis header text
  },

  // Circuit & Hexagon Overlay Accents
  circuitGlow: {
    hexGridLine: '#162232',
    traceActive: '#79C0FF',
    traceInactive: '#212B36',
  },

  // System Status Colors (Fail-Closed Diagnostic Telemetry)
  status: {
    lockedGreen: '#3FB950',   // AVB LOCKED_GREEN / SAFE
    warningYellow: '#D29922', // AVB SELF_SIGNED_YELLOW / THERMAL_WARNING
    unlockedOrange: '#F0883E',// AVB UNLOCKED_ORANGE / UNLIMITED_SCOPE
    criticalRed: '#F85149',   // AVB CORRUPTED_RED / TAMPER_DETECTED
  },
} as const;

export const GRADIENTS = {
  // Metallic "DC" Circuit Emblem Gradient
  dcEmblemBevel: ['#A0B3C6', '#4A5D70', '#1E2833'],
  
  // CodePhrex Metallic Subtext Gradient
  codePhrexMetallic: ['#1A2B4C', '#3B527D', '#6880B0'],

  // Brushed Dark Carbon Background Overlay
  brushedCarbon: ['#0B0E11', '#12161A', '#1A1F26'],

  // Active Circuit Glow Backdrop
  cyberGlowRadial: ['rgba(88, 166, 255, 0.15)', 'rgba(13, 17, 23, 0)'],
} as const;

export const ICON_SPECIFICATIONS = {
  adaptiveIcon: {
    type: 'Squircle Adaptive Icon',
    foregroundSymbol: 'DC Monogram with Circuit Traces',
    bottomSubBadge: 'CP (CodePhrex)',
    backgroundColor: '#0D1117',
  },
  circularIcon: {
    type: 'Circular Metallic Emblem',
    outerRing: 'Beveled Steel Bezel',
    innerPattern: 'Hexagon Grid + Circuit PCB',
  },
  standardDensities: {
    xxxhdpi: '192x192 px',
    xxhdpi: '144x144 px',
    xhdpi: '96x96 px',
    hdpi: '48x48 px',
  },
} as const;
