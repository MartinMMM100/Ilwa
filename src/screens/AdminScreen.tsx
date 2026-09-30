import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Route } from '../../App';
import {
  type AdminIncident,
  type AdminIncidentCategory,
  fetchAdminIncidents,
  setIncidentVerification,
} from '../api/adminIncidents';
import { AdminIncidentModal } from '../components/AdminIncidentModal';
import { AdminStatsGrid } from '../components/AdminStatsGrid';
import { AppHeader } from '../components/AppHeader';
import { colors, shadow } from '../theme';

type AdminScreenProps = {
  navigate: (route: Route) => void;
};

const filterCategories: { key: string; label: string; value: AdminIncidentCategory | null }[] = [
  { key: 'all', label: 'All Categories', value: null },
  { key: 'robbery', label: 'Robbery', value: 'robbery' },
  { key: 'theft', label: 'Theft', value: 'theft' },
  { key: 'assault', label: 'Assault', value: 'assault' },
  { key: 'vandalism', label: 'Vandalism', value: 'vandalism' },
  { key: 'vehicle_theft', label: 'Vehicle Theft', value: 'vehicle_theft' },
  { key: 'suspicious_activity', label: 'Suspicious', value: 'suspicious_activity' },
  { key: 'infrastructure_fault', label: 'Infrastructure', value: 'infrastructure_fault' },
  { key: 'other_unclear', label: 'Other', value: 'other_unclear' },
];

export function AdminScreen({ navigate }: AdminScreenProps) {
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AdminIncidentCategory | null>(null);
  const [onlyArmed, setOnlyArmed] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<AdminIncident | null>(null);

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminIncidents();
      setIncidents(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not fetch incidents from database.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Category filter
      if (selectedCategory && incident.extractedDetails?.category !== selectedCategory) {
        return false;
      }

      // Armed filter
      if (onlyArmed && !incident.extractedDetails?.weaponReported) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const refMatch = incident.reportReference.toLowerCase().includes(query);
        const locMatch =
          incident.extractedDetails?.locationText?.toLowerCase().includes(query) ?? false;
        const timeMatch =
          incident.extractedDetails?.timeText?.toLowerCase().includes(query) ?? false;
        const descMatch = incident.originalDescription.toLowerCase().includes(query);
        const categoryMatch =
          incident.extractedDetails?.category.toLowerCase().includes(query) ?? false;
        const itemsMatch =
          incident.extractedDetails?.itemsTaken.some((item) =>
            item.toLowerCase().includes(query),
          ) ?? false;

        if (!refMatch && !locMatch && !timeMatch && !descMatch && !categoryMatch && !itemsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, selectedCategory, onlyArmed, searchQuery]);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Admin Incident Console"
        subtitle="Live Database Management"
        showBack
        onBack={() => navigate('home')}
        badge={`${incidents.length} Records`}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading Banner */}
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.navy} />
            <Text style={styles.loadingText}>Connecting to MongoDB Atlas...</Text>
          </View>
        ) : null}

        {/* Error Banner */}
        {errorMessage && !isLoading ? (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.red} />
            <Text style={styles.errorTitle}>Database Connection Issue</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadIncidents}
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={colors.white} />
              <Text style={styles.retryBtnText}>Retry Database Query</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            {/* Database Metrics Overview */}
            <AdminStatsGrid incidents={incidents} />

            {/* Filter and Search Bar */}
            <View style={styles.controlsWrap}>
              <View style={styles.searchRow}>
                <View style={styles.searchBar}>
                  <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by reference, location, item, keywords..."
                    placeholderTextColor={colors.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                      onPress={() => setSearchQuery('')}
                      hitSlop={8}
                    >
                      <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh incident data"
                  onPress={loadIncidents}
                  style={({ pressed }) => [styles.refreshIconBtn, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color={colors.navy} />
                </Pressable>
              </View>

              {/* Category Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChips}
              >
                {filterCategories.map((item) => {
                  const selected = selectedCategory === item.value;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setSelectedCategory(item.value)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Armed filter toggle */}
                <Pressable
                  onPress={() => setOnlyArmed(!onlyArmed)}
                  style={[styles.chip, onlyArmed && styles.chipArmedSelected]}
                >
                  <MaterialCommunityIcons
                    name="knife"
                    size={14}
                    color={onlyArmed ? colors.white : colors.red}
                  />
                  <Text style={[styles.chipText, onlyArmed && styles.chipArmedText]}>
                    Armed Only
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Incidents Table / List Section */}
            <View style={styles.listSection}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.listHeading}>INCIDENT ARCHIVE</Text>
                <Text style={styles.listCountBadge}>
                  Showing {filteredIncidents.length} of {incidents.length}
                </Text>
              </View>

              {filteredIncidents.length === 0 ? (
                <View style={styles.emptyCard}>
                  <MaterialCommunityIcons name="file-search-outline" size={32} color={colors.muted} />
                  <Text style={styles.emptyTitle}>No matching incidents</Text>
                  <Text style={styles.emptyBody}>
                    Try clearing filters or changing your search terms.
                  </Text>
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {filteredIncidents.map((incident) => {
                    const reportedDate = new Date(incident.reportedAt).toLocaleDateString(
                      'en-ZA',
                      { day: 'numeric', month: 'short', year: 'numeric' },
                    );
                    const category = incident.extractedDetails?.category?.replace('_', ' ') ?? 'uncategorized';
                    const hasWeapon = Boolean(incident.extractedDetails?.weaponReported);

                    return (
                      <Pressable
                        key={incident.reportReference}
                        accessibilityRole="button"
                        accessibilityLabel={`View incident ${incident.reportReference}`}
                        onPress={() => setSelectedIncident(incident)}
                        style={({ pressed }) => [styles.incidentCard, pressed && styles.cardPressed]}
                      >
                        <View style={styles.cardTopRow}>
                          <View style={styles.refWrap}>
                            <Text style={styles.refText}>{incident.reportReference}</Text>
                            <Text style={styles.dateText}>{reportedDate}</Text>
                          </View>

                          <View style={styles.categoryPill}>
                            <Text style={styles.categoryPillText}>{category.toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={styles.locationRow}>
                          <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={16}
                            color={colors.navy}
                          />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {incident.extractedDetails?.locationText ?? 'Location not extracted'}
                          </Text>
                        </View>

                        <Text style={styles.descriptionSnippet} numberOfLines={2}>
                          {incident.originalDescription}
                        </Text>

                        <View style={styles.cardFooter}>
                          <View style={styles.tagsRow}>
                            {hasWeapon ? (
                              <View style={styles.weaponTag}>
                                <MaterialCommunityIcons name="knife" size={11} color={colors.red} />
                                <Text style={styles.weaponTagText}>
                                  {incident.extractedDetails?.weaponReported}
                                </Text>
                              </View>
                            ) : null}

                            {incident.extractedDetails?.itemsTaken?.length ? (
                              <View style={styles.itemsTag}>
                                <MaterialCommunityIcons
                                  name="bag-personal-outline"
                                  size={11}
                                  color={colors.gold}
                                />
                                <Text style={styles.itemsTagText}>
                                  {incident.extractedDetails.itemsTaken.join(', ')}
                                </Text>
                              </View>
                            ) : null}

                            {incident.isDemoData ? (
                              <View style={styles.demoTag}>
                                <Text style={styles.demoTagText}>DEMO</Text>
                              </View>
                            ) : null}
                          </View>

                          <View style={styles.viewDetailsBtn}>
                            <Text style={styles.viewDetailsText}>View Details</Text>
                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={16}
                              color={colors.navy}
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Incident Detail Modal */}
      <AdminIncidentModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onSetStatus={async (status) => {
          if (!selectedIncident) return;
          try {
            await setIncidentVerification(selectedIncident.reportReference, status);
            const updated = { ...selectedIncident, verificationStatus: status };
            setSelectedIncident(updated);
            setIncidents((list) => list.map((item) => (item.reportReference === updated.reportReference ? updated : item)));
          } catch {
            // Leave the record as it was; the badge in the modal shows the unchanged status.
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  stateCard: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...shadow,
  },
  loadingText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
    borderWidth: 1,
    margin: 16,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  errorTitle: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '800',
  },
  errorBody: {
    color: '#55606B',
    fontSize: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#B42318',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  controlsWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 42,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: colors.ink,
    fontSize: 12,
  },
  refreshIconBtn: {
    width: 42,
    height: 42,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChips: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipArmedSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  chipText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },
  chipArmedText: {
    color: colors.white,
    fontWeight: '800',
  },
  listSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeading: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  listCountBadge: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  cardsList: {
    gap: 10,
  },
  incidentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    ...shadow,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.85,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refWrap: {
    gap: 2,
  },
  refText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
  },
  dateText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  categoryPill: {
    backgroundColor: colors.redSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    color: colors.red,
    fontSize: 9,
    fontWeight: '900',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  descriptionSnippet: {
    color: '#4B5563',
    fontSize: 11,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  weaponTag: {
    backgroundColor: colors.redSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  weaponTagText: {
    color: colors.red,
    fontSize: 9,
    fontWeight: '800',
  },
  itemsTag: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  itemsTagText: {
    color: '#855F00',
    fontSize: 9,
    fontWeight: '800',
  },
  demoTag: {
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoTagText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
