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

          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.eyebrow}>AREA SUMMARY</Text>
              <Text style={styles.summaryTitle}>Reported threat</Text>
            </View>
            <View style={styles.elevatedPill}>
              <MaterialCommunityIcons name="alert-outline" size={13} color="#855F00" />
              <Text style={styles.elevatedText}>ELEVATED</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <Metric label="Common reports" value="Phone snatching, vehicle theft" />
            <Metric label="Peak hours" value="18:00–22:00" />
            <Metric label="Reports in period" value="18 community reports" />
            <Metric label="Last updated" value="Today, 06:42" />
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
      <BottomNav active="map" navigate={navigate} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  summaryHeader: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  summaryTitle: { marginTop: 2, color: colors.ink, fontSize: 18, fontWeight: '900' },
  elevatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.goldSoft,
  },
  elevatedText: { color: '#855F00', fontSize: 9, fontWeight: '900' },
  metrics: { marginVertical: 13, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  metric: { width: '50%', paddingRight: 8 },
  metricLabel: { color: colors.muted, fontSize: 10 },
  metricValue: { marginTop: 3, color: colors.ink, fontSize: 11, lineHeight: 14, fontWeight: '800' },
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
