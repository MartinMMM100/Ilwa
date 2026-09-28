import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';

type PrimaryButtonProps = {
  label: string;
  icon?: string;
  variant?: 'navy' | 'warning';
  onPress?: () => void;
};

export function PrimaryButton({ label, icon, variant = 'navy', onPress }: PrimaryButtonProps) {
  const warning = variant === 'warning';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        warning && styles.warningButton,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon as never}
          size={27}
          color={warning ? colors.ink : colors.white}
        />
      ) : null}
      <Text style={[styles.label, warning && styles.warningLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 11,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.navy,
  },
  warningButton: { backgroundColor: colors.goldSoft },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  label: { color: colors.white, fontSize: 16, fontWeight: '800' },
  warningLabel: { color: colors.ink, fontSize: 20 },
});
