import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AdminIncident, AdminIncidentCategory } from '../api/adminIncidents';
import { colors, shadow } from '../theme';

type AdminStatsGridProps = {
  incidents: AdminIncident[];
};

const categoryLabels: Record<AdminIncidentCategory, string> = {
  robbery: 'Robbery',
  theft: 'Theft',
  assault: 'Assault',
  vandalism: 'Vandalism',
  vehicle_theft: 'Vehicle Theft',
  suspicious_activity: 'Suspicious Activity',
  infrastructure_fault: 'Infrastructure Fault',
  other_unclear: 'Other / Unclear',
};

const categoryColors: Record<AdminIncidentCategory, { text: string; bg: string }> = {
  robbery: { text: colors.red, bg: colors.redSoft },
  theft: { text: colors.gold, bg: colors.goldSoft },
  assault: { text: '#B42318', bg: '#FEE4E2' },
  vandalism: { text: colors.purple, bg: '#F4EBFF' },
  vehicle_theft: { text: '#C4320A', bg: '#FFECE5' },
  suspicious_activity: { text: colors.blue, bg: '#EFF4FF' },
  infrastructure_fault: { text: '#027A48', bg: colors.greenSoft },
  other_unclear: { text: colors.muted, bg: '#EAECF0' },
};

export function AdminStatsGrid({ incidents }: AdminStatsGridProps) {
  const stats = useMemo(() => {
    const total = incidents.length;
    const categoryCounts: Partial<Record<AdminIncidentCategory, number>> = {};
    let weaponsCount = 0;
    let ongoingCount = 0;
    let extractionCompleted = 0;

    for (const incident of incidents) {
      if (incident.extractionStatus === 'completed') {
        extractionCompleted += 1;
      }
      if (incident.extractedDetails) {
        const cat = incident.extractedDetails.category;
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
        if (incident.extractedDetails.weaponReported) {
          weaponsCount += 1;
        }
        if (incident.extractedDetails.isOngoing) {
          ongoingCount += 1;
        }
      }
    }

    let topCategory: AdminIncidentCategory | null = null;
    let topCategoryCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts) as [AdminIncidentCategory, number][]) {
      if (count > topCategoryCount) {
        topCategory = cat;
        topCategoryCount = count;
      }
    }

    const categoriesSorted = (Object.keys(categoryLabels) as AdminIncidentCategory[])
      .map((cat) => ({
        key: cat,
        label: categoryLabels[cat],
        count: categoryCounts[cat] ?? 0,
        colors: categoryColors[cat],
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      weaponsCount,
      ongoingCount,
      extractionCompleted,
      topCategory: topCategory ? categoryLabels[topCategory] : 'None',
      topCategoryCount,
      categoriesSorted,
    };
  }, [incidents]);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeading}>DATABASE METRICS OVERVIEW</Text>
      
      <View style={styles.cardsRow}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.primaryCardLabel}>TOTAL INCIDENTS</Text>
            <MaterialCommunityIcons name="database-outline" size={20} color={colors.white} />
          </View>
          <Text style={styles.primaryCardValue}>{stats.total}</Text>
          <Text style={styles.primaryCardSub}>Live Atlas Records</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.statCardLabel}>TOP CRIME</Text>
            <MaterialCommunityIcons name="alert-decagram-outline" size={20} color={colors.red} />
          </View>
          <Text style={styles.statCardValue} numberOfLines={1}>{stats.topCategory}</Text>
          <Text style={styles.statCardSub}>{stats.topCategoryCount} reported cases</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.statCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.statCardLabel}>WEAPONS CITED</Text>
            <MaterialCommunityIcons name="knife" size={18} color={colors.gold} />
          </View>
          <Text style={styles.statCardValue}>{stats.weaponsCount}</Text>
          <Text style={styles.statCardSub}>Armed reports</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.statCardLabel}>STRUCTURED AI</Text>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.green} />
          </View>
          <Text style={styles.statCardValue}>{stats.extractionCompleted}</Text>
          <Text style={styles.statCardSub}>Extracted details</Text>
        </View>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Incidents by Category</Text>
        <View style={styles.breakdownGrid}>
          {stats.categoriesSorted.map((cat) => (
            <View key={cat.key} style={styles.categoryRow}>
              <View style={[styles.categoryBadge, { backgroundColor: cat.colors.bg }]}>
                <Text style={[styles.categoryBadgeText, { color: cat.colors.text }]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{cat.count}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeading: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  primaryCard: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statCardLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  primaryCardLabel: {
    color: '#A0B8C8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statCardValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  primaryCardValue: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '900',
  },
  statCardSub: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
  },
  primaryCardSub: {
    marginTop: 2,
    color: '#D2E1EB',
    fontSize: 11,
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 4,
    ...shadow,
  },
  breakdownTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  breakdownGrid: {
    gap: 7,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '80%',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },
});
