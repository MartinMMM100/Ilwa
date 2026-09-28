import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Route } from '../../App';
import { AppHeader } from '../components/AppHeader';
import { MapCanvas } from '../components/MapCanvas';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, shadow } from '../theme';

type AreaScreenProps = { navigate: (route: Route) => void };

const facts = [
  { icon: 'alert', color: colors.red, title: 'Danger', detail: 'Poor street lighting' },
  { icon: 'shield-lock-outline', color: colors.ink, title: 'Beware', detail: 'Hijacking reports' },
  { icon: 'shield-star-outline', color: colors.ink, title: 'Police Response', detail: '~ 12 minutes (average)' },
  { icon: 'file-document-outline', color: colors.ink, title: 'Reports', detail: '24 Reports this week' },
];

export function AreaScreen({ navigate }: AreaScreenProps) {
  return (
    <View style={styles.screen}>
      <AppHeader title="Braamfontein" showBack centered onBack={() => navigate('home')} />
      <MapCanvas detailed />

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Area Information</Text>
          <View style={styles.riskPill}>
            <Text style={styles.riskText}>HIGH RISK</Text>
          </View>
        </View>

        <View style={styles.facts}>
          {facts.map((fact, index) => (
            <View key={fact.title} style={[styles.factRow, index > 0 && styles.factBorder]}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={fact.icon as never} size={32} color={fact.color} />
              </View>
              <View style={styles.factCopy}>
                <Text style={styles.factTitle}>{fact.title}</Text>
                <Text style={styles.factDetail}>{fact.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <PrimaryButton
          label="Report an Issue"
          icon="alert-octagon-outline"
          variant="warning"
          onPress={() => navigate('report')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  sheet: {
    flex: 1,
    marginTop: -17,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    backgroundColor: colors.white,
    ...shadow,
  },
  sheetContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: '#080B0D', fontSize: 27, fontWeight: '900' },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.red,
  },
  riskText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  facts: { marginTop: 10, marginBottom: 17 },
  factRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center' },
  factBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  iconWrap: { width: 62, alignItems: 'center' },
  factCopy: { flex: 1 },
  factTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  factDetail: { marginTop: 1, color: '#454E55', fontSize: 11 },
});
