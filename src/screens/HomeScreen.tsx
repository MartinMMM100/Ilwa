import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Route } from '../../App';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { MapCanvas } from '../components/MapCanvas';
import { colors, shadow } from '../theme';

type HomeScreenProps = { navigate: (route: Route) => void };

const cityImage = {
  uri: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=240&q=75',
};

export function HomeScreen({ navigate }: HomeScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AppHeader title="SafetyMap" subtitle="Johannesburg · Live Safety View" badge="Live" />

        <View style={styles.mapWrap}>
          <MapCanvas onSelectArea={() => navigate('area')} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Braamfontein safety information"
          onPress={() => navigate('area')}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={styles.cardHeader}>
            <Image source={cityImage} style={styles.thumb} />
            <View style={styles.cardTitleBlock}>
              <Text style={styles.areaName}>Braamfontein</Text>
              <Text style={styles.areaSubtitle}>Current area safety overview</Text>
            </View>
            <View style={styles.riskPill}>
              <Text style={styles.riskText}>HIGH RISK</Text>
            </View>
          </View>

          <View style={styles.concerns}>
            <Concern icon="alert" color={colors.red} label="Street-lighting Concerns" />
            <Concern icon="alert" color={colors.red} label="Hijacking Reports" />
            <Concern icon="clock-outline" color={colors.ink} label="Peak Reports: 20:00 - 21:00" />
          </View>

          <View style={styles.actions}>
            <ActionButton
              icon="radio-tower"
              label="Live Feed"
              color={colors.green}
              background={colors.greenSoft}
              onPress={() => navigate('feed')}
            />
            <ActionButton
              icon="alert-octagon-outline"
              label="Report"
              color={colors.gold}
              background={colors.goldSoft}
              onPress={() => navigate('report')}
            />
          </View>
        </Pressable>
      </ScrollView>
      <BottomNav active="home" navigate={navigate} />
    </View>
  );
}

function Concern({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <View style={styles.concernRow}>
      <MaterialCommunityIcons name={icon as never} size={30} color={color} />
      <Text style={styles.concernText}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  background,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  background: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [styles.actionButton, { backgroundColor: background }, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon as never} size={27} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 12 },
  mapWrap: {
    marginHorizontal: 14,
    marginTop: 20,
    borderRadius: 9,
    overflow: 'hidden',
  },
  card: {
    marginHorizontal: 14,
    marginTop: -39,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.white,
    ...shadow,
  },
  cardPressed: { transform: [{ scale: 0.995 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 76, height: 55, borderRadius: 12, backgroundColor: '#D9E0E5' },
  cardTitleBlock: { flex: 1, paddingLeft: 9 },
  areaName: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  areaSubtitle: { marginTop: 1, color: colors.muted, fontSize: 11 },
  riskPill: {
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: colors.redSoft,
  },
  riskText: { color: colors.red, fontSize: 9, fontWeight: '900' },
  concerns: { marginTop: 9, marginBottom: 7 },
  concernRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 18 },
  concernText: { color: colors.ink, fontSize: 14, fontWeight: '500' },
  actions: { marginTop: 3, flexDirection: 'row', gap: 18 },
  actionButton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionText: { fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.68 },
});
