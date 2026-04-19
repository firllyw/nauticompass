// components/AlertBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertLevel } from '@/utils/weatherUtils';

interface AlertBannerProps {
  level: AlertLevel;
  messages: string[];
}

export default function AlertBanner({ level, messages }: AlertBannerProps) {
  if (level === 'none' || !messages || messages.length === 0) {
    return null;
  }

  const bgColor = level === 'danger' ? '#B71C1C' : '#F57F17';
  const icon = level === 'danger' ? '🚨' : '⚠';

  const primaryMessage = messages[0];
  const extraCount = messages.length - 1;
  const displayText =
    extraCount > 0
      ? `${icon} ${primaryMessage} (+${extraCount} more)`
      : `${icon} ${primaryMessage}`;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
