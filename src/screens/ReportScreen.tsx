import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Route } from '../../App';
import { AppHeader } from '../components/AppHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme';

type ReportScreenProps = { navigate: (route: Route) => void };
type ReportCategory = 'Crime' | 'Danger' | 'Other';

const issues = [
  { label: 'Theft', icon: 'account-cowboy-hat' },
  { label: 'Assault', icon: 'boxing-glove' },
  { label: 'Suspicious\nActivity', icon: 'eye' },
  { label: 'Hijacking', icon: 'car' },
  { label: 'Vandalism', icon: 'image-broken-variant' },
  { label: 'Other', icon: 'dots-horizontal-circle-outline' },
];

export function ReportScreen({ navigate }: ReportScreenProps) {
  const [category, setCategory] = useState<ReportCategory>('Crime');
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [locationAdded, setLocationAdded] = useState(false);

  const submit = () => {
    if (!issue) {
      Alert.alert('Choose an issue', 'Please select the type of incident you are reporting.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Add a description', 'A short description helps nearby people understand what happened.');
      return;
    }
    Alert.alert('Report submitted', 'Thank you. Your community report has been received.', [
      { text: 'Done', onPress: () => navigate('home') },
    ]);
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Report" showBack onBack={() => navigate('home')} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>What’s the Issue?</Text>
        <Text style={styles.intro}>Help people nearby understand{`\n`}what is happening.</Text>

        <View style={styles.segmented}>
          {(['Crime', 'Danger', 'Other'] as ReportCategory[]).map((item) => {
            const selected = item === category;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.issueGrid}>
          {issues.map((item) => {
            const selected = issue === item.label;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setIssue(item.label)}
                style={({ pressed }) => [
                  styles.issueCard,
                  selected && styles.issueSelected,
                  pressed && styles.pressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as never}
                  size={43}
                  color={selected ? colors.white : '#090C0F'}
                />
                <Text style={[styles.issueLabel, selected && styles.issueLabelSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Description</Text>
        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel="Report description"
            multiline
            maxLength={500}
            onChangeText={setDescription}
            placeholder="Describe what happened..."
            placeholderTextColor="#A1A8AE"
            style={styles.input}
            textAlignVertical="top"
            value={description}
          />
          <Text style={styles.counter}>{description.length}/500</Text>
        </View>

        <Text style={styles.optional}>Add location (optional)</Text>
        <Pressable
          onPress={() => setLocationAdded((value) => !value)}
          style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons
            name={locationAdded ? 'map-marker-check' : 'map-marker'}
            size={24}
            color={locationAdded ? colors.green : '#A9AFB4'}
          />
          <Text style={[styles.locationText, locationAdded && styles.locationTextAdded]}>
            {locationAdded ? 'Braamfontein · Current location' : 'Use current location'}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={27} color="#A9AFB4" />
        </Pressable>

        <View style={styles.submitWrap}>
          <PrimaryButton label="Submit Report" icon="send-outline" onPress={submit} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 26, paddingTop: 14, paddingBottom: 22 },
  heading: { color: '#080B0D', fontSize: 27, lineHeight: 33, fontWeight: '900' },
  intro: { marginTop: 1, color: colors.ink, fontSize: 14, lineHeight: 17 },
  segmented: {
    height: 49,
    marginTop: 31,
    marginBottom: 20,
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#DCDDDE',
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentSelected: { backgroundColor: colors.navy },
  segmentText: { color: colors.navy, fontSize: 18, fontWeight: '600' },
  segmentTextSelected: { color: colors.white },
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 17 },
  issueCard: {
    width: '29.5%',
    aspectRatio: 0.95,
    minHeight: 92,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#E3E3E3',
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 3,
  },
  issueSelected: { borderColor: colors.navy, backgroundColor: colors.navy },
  issueLabel: { color: colors.ink, fontSize: 11, lineHeight: 12, textAlign: 'center', fontWeight: '800' },
  issueLabelSelected: { color: colors.white },
  pressed: { opacity: 0.66 },
  fieldLabel: { marginTop: 11, marginBottom: 4, color: colors.ink, fontSize: 14, fontWeight: '800' },
  inputWrap: {
    minHeight: 118,
    borderWidth: 1.5,
    borderColor: '#D2D6D9',
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  input: { minHeight: 90, paddingHorizontal: 9, paddingTop: 8, color: colors.ink, fontSize: 12 },
  counter: { position: 'absolute', right: 7, bottom: 5, color: '#9BA2A8', fontSize: 10 },
  optional: { marginTop: 8, marginBottom: 4, color: '#525B61', fontSize: 11 },
  location: {
    height: 39,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#D5D9DC',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: { flex: 1, marginLeft: 5, color: '#B2B7BB', fontSize: 12 },
  locationTextAdded: { color: colors.green, fontWeight: '700' },
  submitWrap: { marginTop: 10 },
});
