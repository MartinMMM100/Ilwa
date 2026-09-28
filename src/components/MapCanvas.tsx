import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type MapCanvasProps = {
  detailed?: boolean;
  onSelectArea?: () => void;
};

const roads = [
  { top: '12%', left: '-8%', width: '120%', rotate: '-5deg' },
  { top: '31%', left: '-10%', width: '125%', rotate: '9deg' },
  { top: '58%', left: '-8%', width: '120%', rotate: '-2deg' },
  { top: '79%', left: '-10%', width: '120%', rotate: '6deg' },
] as const;

const verticalRoads = [
  { left: '16%', rotate: '4deg' },
  { left: '45%', rotate: '-7deg' },
  { left: '73%', rotate: '6deg' },
] as const;

const zones = [
  { level: 'Lower', top: '20%', left: '30%', width: '31%', height: '29%', color: '#BBD9C3', border: '#27875B', rotate: '3deg' },
  { level: 'Elevated', top: '18%', left: '62%', width: '30%', height: '27%', color: '#F2D991', border: '#D39A16', rotate: '-3deg' },
  { level: 'Elevated', top: '52%', left: '31%', width: '29%', height: '31%', color: '#F1D78B', border: '#D39A16', rotate: '-2deg' },
  { level: 'Higher', top: '49%', left: '62%', width: '31%', height: '32%', color: '#E7AAA5', border: '#D93B37', rotate: '-3deg' },
] as const;

export function MapCanvas({ detailed = false, onSelectArea }: MapCanvasProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Braamfontein area information"
      onPress={onSelectArea}
      style={[styles.map, detailed && styles.mapDetailed]}
    >
      <View style={styles.parkLeft} />
      <View style={styles.parkTop} />

      {roads.map((road, index) => (
        <View
          key={`h-${index}`}
          style={[
            styles.road,
            {
              top: road.top,
              left: road.left,
              width: road.width,
              transform: [{ rotate: road.rotate }],
            },
          ]}
        />
      ))}
      {verticalRoads.map((road, index) => (
        <View
          key={`v-${index}`}
          style={[
            styles.roadVertical,
            { left: road.left, transform: [{ rotate: road.rotate }] },
          ]}
        />
      ))}

      {zones.map((zone, index) => (
        <View
          key={`${zone.level}-${index}`}
          style={[
            styles.zone,
            {
              top: zone.top,
              left: zone.left,
              width: zone.width,
              height: zone.height,
              backgroundColor: zone.color,
              borderColor: zone.border,
              transform: [{ rotate: zone.rotate }],
            },
          ]}
        />
      ))}

      <Text style={[styles.street, { top: '29%', left: '67%' }]}>Jorissen St</Text>
      <Text style={[styles.street, { top: '63%', left: '65%' }]}>De Beer St</Text>
      <Text style={[styles.street, { top: '76%', left: '6%' }]}>De Korte St</Text>
      <Text style={[styles.streetVertical, { top: '39%', left: '27%' }]}>Bertha St</Text>

      <View style={[styles.pin, { top: detailed ? '63%' : '60%', left: '76%' }]}>
        <MaterialCommunityIcons name="map-marker" size={42} color="#006B5B" />
      </View>

      <View style={styles.mapLabel}>
        <Text style={styles.mapLabelText}>COMMUNITY REPORT MAP</Text>
      </View>

      <View style={styles.zoomControls}>
        <Text style={styles.zoomText}>+</Text>
        <View style={styles.zoomDivider} />
        <Text style={styles.zoomText}>−</Text>
      </View>

      <View style={styles.legend}>
        <LegendItem color="#27875B" label="Lower" />
        <LegendItem color="#D39A16" label="Elevated" />
        <LegendItem color="#D93B37" label="Higher" />
      </View>
    </Pressable>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 278,
    overflow: 'hidden',
    backgroundColor: '#E9EEF3',
  },
  mapDetailed: { height: 286 },
  parkLeft: {
    position: 'absolute',
    left: -20,
    top: 70,
    width: 92,
    height: 180,
    backgroundColor: '#BFE7CC',
    transform: [{ rotate: '-7deg' }],
  },
  parkTop: {
    position: 'absolute',
    right: 50,
    top: -18,
    width: 80,
    height: 62,
    borderRadius: 24,
    backgroundColor: '#CDEDD7',
  },
  road: {
    position: 'absolute',
    height: 19,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D1D9E0',
    backgroundColor: '#FFFFFF',
  },
  roadVertical: {
    position: 'absolute',
    top: '-15%',
    width: 17,
    height: '135%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D1D9E0',
    backgroundColor: '#FFFFFF',
  },
  street: {
    position: 'absolute',
    color: '#75818B',
    fontSize: 8,
    transform: [{ rotate: '-4deg' }],
  },
  streetVertical: {
    position: 'absolute',
    color: '#35434D',
    fontSize: 9,
    fontWeight: '700',
    transform: [{ rotate: '90deg' }],
  },
  zone: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.78,
  },
  pin: { position: 'absolute', marginLeft: -17, marginTop: -17 },
  mapLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapLabelText: { color: colors.navy, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  zoomControls: {
    position: 'absolute',
    left: 10,
    top: 43,
    width: 72,
    height: 34,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  zoomText: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 17, fontWeight: '700' },
  zoomDivider: { width: 1, height: 20, backgroundColor: colors.line },
  legend: {
    position: 'absolute',
    right: 9,
    top: 10,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  legendText: { color: '#39444C', fontSize: 8, fontWeight: '700' },
});
