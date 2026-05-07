import type { TextStyle } from 'react-native';

export const fontFamilies = {
  display: 'Georgia',
  body: 'System',
  numeric: 'Courier',
};

export const typography = {
  kicker: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  sectionHead: {
    fontFamily: fontFamilies.display,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
  } satisfies TextStyle,
  hero: {
    fontFamily: fontFamilies.display,
    fontSize: 56,
    lineHeight: 58,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  heading: {
    fontFamily: fontFamilies.display,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '500',
  } satisfies TextStyle,
  subhead: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  } satisfies TextStyle,
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } satisfies TextStyle,
  metric: {
    fontFamily: fontFamilies.numeric,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
  metricSm: {
    fontFamily: fontFamilies.numeric,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
};
