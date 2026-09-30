import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PublicFeedItem } from '../api/feed';
import { colors, shadow } from '../theme';

type FeedStoryModalProps = {
  story: PublicFeedItem | null;
  onClose: () => void;
};

export function FeedStoryModal({ story, onClose }: FeedStoryModalProps) {
  if (!story) {
    return null;
  }

  const details = story.details;
  const reportedAt = new Date(story.reportedAt).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>COMMUNITY REPORT DETAILS</Text>
              <Text style={styles.reference}>{story.id}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close report details"
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {story.photoUrl ? (
              <Image source={{ uri: story.photoUrl }} resizeMode="cover" style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="image-off-outline" size={32} color={colors.muted} />
                <Text style={styles.photoPlaceholderText}>No supporting photo was submitted</Text>
              </View>
            )}

            <View style={styles.badges}>
              <Badge label={story.category.toUpperCase()} background={colors.redSoft} color={colors.red} />
              <Badge label="UNVERIFIED" background="#EAECF0" color="#475467" />
              <Badge
                label={`${story.threatLevel.toUpperCase()} THREAT`}
                background={colors.goldSoft}
                color="#755400"
              />
              {story.isDemoData ? (
                <Badge label="DEMO REPORT" background="#E8F0FE" color={colors.blue} />
              ) : null}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.incidentType}>{story.incidentType}</Text>
              <Text style={styles.title}>{story.title}</Text>
              <Text style={styles.reportedAt}>Submitted {reportedAt}</Text>
            </View>

            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>STRUCTURED INCIDENT INFORMATION</Text>
              <FactRow icon="map-marker-outline" label="Location" value={story.location ?? 'Not provided'} />
              <FactRow icon="clock-outline" label="Reported time" value={details.timeText ?? 'Not provided'} />
              <FactRow
                icon="account-group-outline"
                label="People involved"
                value={details.offenderCount === null ? 'Not provided' : String(details.offenderCount)}
              />
              <FactRow icon="shield-alert-outline" label="Weapon mentioned" value={details.weaponReported ?? 'None reported'} />
              <FactRow icon="medical-bag" label="Injuries mentioned" value={details.injuriesReported ?? 'None reported'} />
              <FactRow
                icon="bag-personal-outline"
                label="Items taken"
                value={details.itemsTaken.length > 0 ? details.itemsTaken.join(', ') : 'None reported'}
              />
              <FactRow
                icon="progress-alert"
                label="Reported as ongoing"
                value={details.isOngoing === null ? 'Unknown' : details.isOngoing ? 'Yes' : 'No'}
                last
              />
            </View>

            <View style={styles.noticeCard}>
              <MaterialCommunityIcons name="information-outline" size={19} color={colors.navy} />
              <Text style={styles.noticeText}>
                This is an unverified community submission, not an emergency alert. Call 112 if anyone is in immediate danger.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Badge({ label, background, color }: { label: string; background: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function FactRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.factRow, last && styles.factRowLast]}>
      <MaterialCommunityIcons name={icon as never} size={19} color={colors.navy} />
      <View style={styles.factCopy}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,15,25,0.65)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    ...shadow,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  reference: { color: colors.navy, fontSize: 16, fontWeight: '900', marginTop: 2 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: { padding: 16, gap: 12 },
  photo: { width: '100%', height: 210, borderRadius: 14, backgroundColor: '#DDE3E7' },
  photoPlaceholder: {
    height: 110,
    borderRadius: 14,
    backgroundColor: '#E9EDF0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  summaryCard: { backgroundColor: colors.white, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: colors.line },
  incidentType: { color: colors.red, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '900', marginTop: 4 },
  reportedAt: { color: colors.muted, fontSize: 10, marginTop: 8 },
  detailsCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  sectionTitle: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  factRow: { flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  factRowLast: { borderBottomWidth: 0 },
  factCopy: { flex: 1 },
  factLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  factValue: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 1 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#EAF3F8' },
  noticeText: { flex: 1, color: '#264A60', fontSize: 10, lineHeight: 15, fontWeight: '600' },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingVertical: 12 },
  doneButton: { height: 46, borderRadius: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
