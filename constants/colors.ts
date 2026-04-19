// constants/colors.ts
export const COLORS = {
  // Dark maritime theme
  bgPrimary: '#0A1628',        // deep ocean dark
  bgSecondary: '#0D1F3C',      // panel background
  bgTertiary: '#1A3A5C',       // card background
  accent: '#4FC3F7',           // light blue — primary interactive
  accentDeep: '#0288D1',       // deeper blue
  textPrimary: '#E0F2FE',      // near white
  textSecondary: '#4A7A9B',    // muted blue-grey
  success: '#00E676',          // green
  warning: '#FF6F00',          // amber
  danger: '#B71C1C',           // dark red
  dangerLight: '#EF5350',      // lighter red for text on dark bg
  laneColorMajor: '#4FC3F7',
  laneColorMiddle: '#0288D1',
  laneColorMinor: '#01579B',
  portMarker: '#FF6F00',
} as const;

export type ColorKey = keyof typeof COLORS;
