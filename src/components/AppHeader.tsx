import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  centered?: boolean;
  onBack?: () => void;
  badge?: string;
};

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  centered = false,
  onBack,
  badge,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, centered && styles.headerCentered]}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={30} color={colors.white} />
        </Pressable>
      ) : null}

      <View style={[styles.titleBlock, centered && styles.centerTitle]}>
        {title ? <Text style={[styles.title, centered && styles.centerText]}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {badge ? (
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 116,
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  headerCentered: {
    minHeight: 90,
    paddingTop: 18,
    justifyContent: 'center',
  },
  back: {
    width: 38,
    height: 44,
    justifyContent: 'center',
    zIndex: 2,
  },
  pressed: { opacity: 0.58 },
  titleBlock: { flex: 1 },
  centerTitle: {
    position: 'absolute',
    left: 64,
    right: 64,
    alignItems: 'center',
  },
  title: {
    color: colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  centerText: { textAlign: 'center' },
  subtitle: {
    marginTop: 1,
    color: '#D2E1EB',
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.redSoft,
    borderRadius: 18,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
  badgeText: {
    color: '#BB2231',
    fontSize: 11,
    fontWeight: '800',
  },
});
