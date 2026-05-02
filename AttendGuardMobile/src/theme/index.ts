// src/theme/index.ts
export const Colors = {
  // Background
  bg: '#0a0f1e',
  bgCard: '#0f172a',
  bgElevated: '#1e293b',
  bgInput: '#1e293b',

  // Border
  border: '#1e293b',
  borderLight: '#334155',
  borderFocus: '#06b6d4',

  // Brand
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  primaryLight: '#67e8f9',
  primaryBg: 'rgba(6,182,212,0.1)',

  // Status
  safe: '#10b981',
  safeBg: 'rgba(16,185,129,0.12)',
  safeBorder: 'rgba(16,185,129,0.3)',

  suspicious: '#f59e0b',
  suspiciousBg: 'rgba(245,158,11,0.12)',
  suspiciousBorder: 'rgba(245,158,11,0.3)',

  fraud: '#ef4444',
  fraudBg: 'rgba(239,68,68,0.12)',
  fraudBorder: 'rgba(239,68,68,0.3)',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  textDisabled: '#334155',

  // Roles
  admin: '#f59e0b',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  emerald: '#10b981',

  // Misc
  red: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
}

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 34,
}

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cyan: {
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
}
