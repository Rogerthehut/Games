import { Platform } from 'react-native';

export const palette = {
  canvas: '#F8F2E7',
  paper: '#FFFCF7',
  ink: '#191D38',
  inkSoft: '#34374D',
  muted: '#666577',
  indigo: '#3D447F',
  dustyRose: '#D97A9B',
  rose: '#F3B7CB',
  lilac: '#CDD0EC',
  gold: '#F3D18E',
  mint: '#ACDFC9',
  green: '#3E8A70',
  red: '#9A4C56',
  sand: '#E7DDCB',
  hairline: 'rgba(55, 43, 34, .17)',
} as const;

export const radii = { button: 16, panel: 22, card: 26 } as const;

export const shadow = {
  card: Platform.select({
    ios: { shadowColor: '#3A2F26', shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
    android: { elevation: 4 },
    default: {},
  }),
  soft: Platform.select({
    ios: { shadowColor: '#3A2F26', shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 2 },
    default: {},
  }),
} as const;
