import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Route } from '../../App';
import { colors } from '../theme';

type BottomNavProps = {
  active: 'home' | 'map' | 'feed' | 'report';
  navigate: (route: Route) => void;
};

const items = [
  { key: 'home', label: 'Home', icon: 'home', route: 'home' },
  { key: 'map', label: 'Map', icon: 'map-outline', route: 'home' },
  { key: 'feed', label: 'Feed', icon: 'newspaper-variant-outline', route: 'feed' },
  { key: 'report', label: 'Report', icon: 'alert-octagon-outline', route: 'report' },
] as const;

export function BottomNav({ active, navigate }: BottomNavProps) {
  return (
    <View style={styles.nav}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => navigate(item.route)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={29}
              color={selected ? colors.navy : '#1D252B'}
            />
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 68,
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.55 },
  label: {
    marginTop: 1,
    color: '#363F45',
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: { color: colors.navy, fontWeight: '900' },
});
