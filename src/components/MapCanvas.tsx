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

      <Text style={[styles.street, { top: '21%', left: '46%' }]}>Jorissen St</Text>
      <Text style={[styles.street, { top: '61%', left: '12%' }]}>De Korte St</Text>
      <Text style={[styles.areaLabel, { top: '48%', left: '38%' }]}>BRAAMFONTEIN</Text>

      <View style={[styles.riskCircle, detailed && styles.riskCircleDetailed]} />

      <View style={[styles.pin, { top: detailed ? '31%' : '42%', left: detailed ? '50%' : '54%' }]}>
        <MaterialCommunityIcons name="map-marker" size={34} color="#8055B6" />
      </View>
      <View style={[styles.warning, { top: detailed ? '58%' : '66%', left: detailed ? '14%' : '46%' }]}>
        <MaterialCommunityIcons name="alert" size={17} color={colors.white} />
      </View>
      <View style={[styles.warning, { top: detailed ? '72%' : '27%', right: detailed ? '5%' : '17%' }]}>
        <MaterialCommunityIcons name="alert" size={17} color={colors.white} />
      </View>
      <View style={[styles.warning, { top: detailed ? '46%' : '78%', left: detailed ? '4%' : '70%' }]}>
        <MaterialCommunityIcons name="alert" size={17} color={colors.white} />
      </View>
    </Pressable>
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
  areaLabel: {
    position: 'absolute',
    color: '#53616C',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  riskCircle: {
    position: 'absolute',
    left: '28%',
    top: '26%',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: 'rgba(255,38,58,0.15)',
  },
  riskCircleDetailed: {
    left: '32%',
    top: '10%',
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  pin: { position: 'absolute', marginLeft: -17, marginTop: -17 },
  warning: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.red,
  },
});
