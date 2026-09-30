import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AdminIncident } from '../api/adminIncidents';
import { colors, shadow } from '../theme';

type AdminIncidentModalProps = {
  onSetStatus?: (status: 'verified' | 'dismissed') => void;
  incident: AdminIncident | null;
  onClose: () => void;
};

export function AdminIncidentModal({ incident, onClose, onSetStatus }: AdminIncidentModalProps) {
  if (!incident) {
    return null;
  }

  const reportedFormatted = new Date(incident.reportedAt).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const updatedFormatted = new Date(incident.updatedAt).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const category = incident.extractedDetails?.category?.replace('_', ' ') ?? 'Uncategorized';
  const locationText = incident.extractedDetails?.locationText ?? 'Not specified';
  const timeText = incident.extractedDetails?.timeText ?? 'Not specified';
  const items = incident.extractedDetails?.itemsTaken ?? [];
  const weapon = incident.extractedDetails?.weaponReported ?? 'None reported';
  const offenders = incident.extractedDetails?.offenderCount != null
    ? `${incident.extractedDetails.offenderCount} reported`
    : 'Unknown';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.eyebrow}>INCIDENT DOSSIER</Text>
              <Text style={styles.reference}>{incident.reportReference}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dossier"
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Badges Bar */}
            <View style={styles.badgesRow}>
              <View style={[styles.badge, styles.categoryBadge]}>
                <Text style={styles.categoryBadgeText}>{category.toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, styles.statusBadge]}>
                <Text style={styles.statusBadgeText}>{incident.status.toUpperCase()}</Text>
              </View>
              <View style={[styles.badge, styles.unverifiedBadge]}>
                <Text style={styles.unverifiedBadgeText}>{incident.verificationStatus.toUpperCase()}</Text>
              </View>
              {incident.isDemoData ? (
                <View style={[styles.badge, styles.demoBadge]}>
                  <Text style={styles.demoBadgeText}>DEMO RECORD</Text>
                </View>
              ) : null}
            </View>

            {/* Extracted Intelligence */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeading}>STRUCTURED FACT EXTRACTION</Text>
              
              <View style={styles.factRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.navy} />
                <View style={styles.factCopy}>
                  <Text style={styles.factLabel}>Reported Location Phrase</Text>
                  <Text style={styles.factValue}>{locationText}</Text>
                </View>
              </View>

              <View style={styles.factRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.navy} />
                <View style={styles.factCopy}>
                  <Text style={styles.factLabel}>Reported Time Phrase</Text>
                  <Text style={styles.factValue}>{timeText}</Text>
                </View>
              </View>

              <View style={styles.factRow}>
                <MaterialCommunityIcons name="account-group-outline" size={18} color={colors.navy} />
                <View style={styles.factCopy}>
                  <Text style={styles.factLabel}>Offender Count</Text>
                  <Text style={styles.factValue}>{offenders}</Text>
                </View>
              </View>

              <View style={styles.factRow}>
                <MaterialCommunityIcons name="knife" size={18} color={colors.red} />
                <View style={styles.factCopy}>
                  <Text style={styles.factLabel}>Weapon Mentioned</Text>
                  <Text style={styles.factValue}>{weapon}</Text>
                </View>
              </View>

              <View style={styles.factRow}>
                <MaterialCommunityIcons name="bag-personal-outline" size={18} color={colors.gold} />
                <View style={styles.factCopy}>
                  <Text style={styles.factLabel}>Items Taken</Text>
                  <Text style={styles.factValue}>
                    {items.length > 0 ? items.join(', ') : 'None documented'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Original Submitted Narrative */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeading}>SUBMITTED RESIDENT NARRATIVE</Text>
              <Text style={styles.narrativeText}>{incident.originalDescription}</Text>
            </View>

            {/* Database & Audit Metadata */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeading}>DATABASE RECORD METADATA</Text>
              
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>First Stored (reportedAt):</Text>
                <Text style={styles.metaVal}>{reportedFormatted}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Last Updated (updatedAt):</Text>
                <Text style={styles.metaVal}>{updatedFormatted}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Extraction Status:</Text>
                <Text style={styles.metaVal}>{incident.extractionStatus}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Extraction Provider:</Text>
                <Text style={styles.metaVal}>{incident.extractionMethod}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Reporter ID (private):</Text>
                <Text style={styles.metaVal}>{incident.reporterId}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Submission ID:</Text>
                <Text style={styles.metaVal} numberOfLines={1}>{incident.submissionId}</Text>
              </View>
              {incident._id ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaKey}>MongoDB ObjectId:</Text>
                  <Text style={styles.metaVal} numberOfLines={1}>{incident._id}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            {onSetStatus ? (
              <View style={styles.reviewRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSetStatus('verified')}
                  disabled={incident.verificationStatus === 'verified'}
                  style={({ pressed }) => [styles.reviewBtn, styles.verifyBtn, (pressed || incident.verificationStatus === 'verified') && styles.pressed]}
                >
                  <Text style={styles.reviewBtnText}>{incident.verificationStatus === 'verified' ? 'Verified' : 'Verify'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSetStatus('dismissed')}
                  disabled={incident.verificationStatus === 'dismissed'}
                  style={({ pressed }) => [styles.reviewBtn, styles.dismissBtn, (pressed || incident.verificationStatus === 'dismissed') && styles.pressed]}
                >
                  <Text style={styles.reviewBtnText}>{incident.verificationStatus === 'dismissed' ? 'Dismissed' : 'Dismiss'}</Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
            >
              <Text style={styles.doneBtnText}>Close Record</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 15, 25, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    ...shadow,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitleWrap: {
    flex: 1,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  reference: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryBadge: {
    backgroundColor: colors.redSoft,
  },
  categoryBadgeText: {
    color: colors.red,
    fontSize: 10,
    fontWeight: '900',
  },
  statusBadge: {
    backgroundColor: colors.greenSoft,
  },
  statusBadgeText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
  },
  unverifiedBadge: {
    backgroundColor: '#EAECF0',
  },
  unverifiedBadgeText: {
    color: '#475467',
    fontSize: 10,
    fontWeight: '800',
  },
  demoBadge: {
    backgroundColor: colors.goldSoft,
  },
  demoBadgeText: {
    color: '#855F00',
    fontSize: 10,
    fontWeight: '900',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHeading: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  factCopy: {
    flex: 1,
  },
  factLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  factValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  narrativeText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.navy,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F4F7',
  },
  metaKey: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  metaVal: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: '55%',
    textAlign: 'right',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  reviewRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  reviewBtn: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  verifyBtn: { backgroundColor: colors.green },
  dismissBtn: { backgroundColor: colors.red },
  reviewBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  doneBtn: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
});
