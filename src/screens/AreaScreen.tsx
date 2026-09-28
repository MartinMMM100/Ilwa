import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Route } from '../../App';
import { AppHeader } from '../components/AppHeader';
import { MapCanvas } from '../components/MapCanvas';
import { colors, shadow } from '../theme';

type AreaScreenProps = { navigate: (route: Route) => void };

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

        <View style={styles.concernCard}>
          <MaterialCommunityIcons name="lightbulb-alert-outline" size={27} color={colors.red} />
          <View style={styles.concernCopy}>
            <Text style={styles.sectionEyebrow}>REPORTED CONCERN</Text>
            <Text style={styles.concernTitle}>Broken streetlights near De Korte Street</Text>
            <Text style={styles.concernDetail}>Recorded separately from reported incidents.</Text>
          </View>
        </View>

        <SectionTitle title="Response-time information" />
        <View style={styles.metricGrid}>
          <Metric label="Median acknowledgement" value="14 minutes" />
          <Metric label="Sample size" value="8 accepted reports" />
          <Metric label="Source" value="Community response log" />
          <Metric label="Delay reason" value="Unknown" />
        </View>

        <SectionTitle title="Recent reports" />
        <ReportRow title="Phone snatching" detail="Juta Street precinct · Today, 06:10" tag="COMMUNITY" />
        <ReportRow title="Streetlight fault" detail="De Korte Street · Yesterday, 16:25" tag="VERIFIED" verified />

        <Text style={styles.disclaimer}>
          Community-supplied information can be incomplete. Lower reported threat never guarantees safety.
        </Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate('feed')}
            style={({ pressed }) => [styles.actionButton, styles.feedButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="radio-tower" size={22} color={colors.green} />
            <Text style={styles.feedText}>Live Feed</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate('report')}
            style={({ pressed }) => [styles.actionButton, styles.reportButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="alert-octagon-outline" size={22} color={colors.white} />
            <Text style={styles.reportText}>Report</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ReportRow({
  title,
  detail,
  tag,
  verified = false,
}: {
  title: string;
  detail: string;
  tag: string;
  verified?: boolean;
}) {
  return (
    <View style={styles.reportRow}>
      <View style={styles.reportCopy}>
        <Text style={styles.reportTitle}>{title}</Text>
        <Text style={styles.reportDetail}>{detail}</Text>
      </View>
      <View style={[styles.tag, verified && styles.verifiedTag]}>
        <Text style={[styles.tagText, verified && styles.verifiedTagText]}>{tag}</Text>
      </View>
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
  concernCard: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.redSoft,
  },
  concernCopy: { flex: 1, marginLeft: 11 },
  sectionEyebrow: { color: '#A21F2D', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  concernTitle: { marginTop: 3, color: colors.ink, fontSize: 13, fontWeight: '800' },
  concernDetail: { marginTop: 3, color: colors.muted, fontSize: 10 },
  sectionTitle: {
    marginTop: 19,
    marginBottom: 9,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 13 },
  metric: { width: '50%', paddingRight: 10 },
  metricLabel: { color: colors.muted, fontSize: 10 },
  metricValue: { marginTop: 3, color: colors.ink, fontSize: 12, fontWeight: '800' },
  reportRow: {
    minHeight: 61,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportCopy: { flex: 1 },
  reportTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  reportDetail: { marginTop: 4, color: colors.muted, fontSize: 10 },
  tag: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5, backgroundColor: '#ECEFF1' },
  tagText: { color: '#4B565E', fontSize: 8, fontWeight: '800' },
  verifiedTag: { backgroundColor: colors.greenSoft },
  verifiedTagText: { color: colors.green },
  disclaimer: { marginTop: 14, color: colors.muted, fontSize: 9, lineHeight: 13 },
  actions: { marginTop: 15, flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  feedButton: { backgroundColor: colors.greenSoft },
  reportButton: { backgroundColor: colors.navy },
  feedText: { color: colors.green, fontSize: 14, fontWeight: '800' },
  reportText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.68 },
});
