import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Route } from '../../App';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme';

type ReportScreenProps = { navigate: (route: Route) => void };
type InputMode = 'text' | 'voice';

const incidentTypes = [
  'Theft or robbery',
  'Assault',
  'Hijacking',
  'Suspicious activity',
  'Infrastructure fault',
  'Other',
];

export function ReportScreen({ navigate }: ReportScreenProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Braamfontein, Johannesburg');
  const [happeningNow, setHappeningNow] = useState(true);
  const [incidentType, setIncidentType] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState<{ uri: string; name: string } | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);

  const handleBack = async () => {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
    }
    navigate('home');
  };

  const toggleRecording = async () => {
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        setVoiceUri(audioRecorder.uri ?? null);
        return;
      }

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Allow microphone access to add a voice note.');
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceUri(null);
    } catch {
      Alert.alert('Voice note unavailable', 'The recording could not be started on this device.');
    }
  };

  const pickAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({ uri: asset.uri, name: asset.fileName ?? 'Photo attached' });
    }
  };

  const requestAssistance = () => {
    Alert.alert(
      'Emergency assistance',
      'If anyone is in immediate danger, call 112. This opens your phone dialer and does not place the call automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open dialer', onPress: () => Linking.openURL('tel:112') },
      ],
    );
  };

  const submit = () => {
    if (inputMode === 'text' && !description.trim()) {
      Alert.alert('Add an incident summary', 'Describe what you can see and whether anyone is in danger.');
      return;
    }
    if (inputMode === 'voice' && !voiceUri) {
      Alert.alert('Add a voice note', 'Record and stop a voice note before submitting the report.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Add a location', 'Reports need an area or street location.');
      return;
    }

    Alert.alert(
      'Demo report saved',
      'This report is stored only in the current app session. No emergency service has been contacted.',
      [{ text: 'Done', onPress: () => navigate('home') }],
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Report" showBack onBack={handleBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>COMMUNITY SAFETY REPORT</Text>
        <Text style={styles.heading}>What is happening?</Text>
        <Text style={styles.intro}>Share only what you can confirm. Your report helps people understand the area.</Text>

        <View style={styles.warningCard}>
          <MaterialCommunityIcons name="shield-alert-outline" size={24} color="#A51E2C" />
          <Text style={styles.warningText}>
            This is not an emergency service. If someone is in immediate danger, call 112.
          </Text>
        </View>

        <View style={styles.modeSwitch}>
          <ModeButton
            icon="text-long"
            label="Type summary"
            selected={inputMode === 'text'}
            onPress={() => !recorderState.isRecording && setInputMode('text')}
          />
          <ModeButton
            icon="microphone-outline"
            label="Voice note"
            selected={inputMode === 'voice'}
            onPress={() => setInputMode('voice')}
          />
        </View>

        {inputMode === 'text' ? (
          <Field label="Incident summary">
            <View style={styles.summaryWrap}>
              <TextInput
                accessibilityLabel="Incident summary"
                multiline
                maxLength={500}
                onChangeText={setDescription}
                placeholder="Describe what you can see, where it is happening, and whether anyone is in immediate danger."
                placeholderTextColor="#8D989F"
                style={styles.summaryInput}
                textAlignVertical="top"
                value={description}
              />
              <Text style={styles.counter}>{description.length}/500</Text>
            </View>
          </Field>
        ) : (
          <Field label="Voice note" helper="Recording begins only when you press record.">
            <Pressable
              accessibilityRole="button"
              onPress={toggleRecording}
              style={({ pressed }) => [
                styles.recordButton,
                recorderState.isRecording && styles.recordButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.recordIcon, recorderState.isRecording && styles.recordIconActive]}>
                <MaterialCommunityIcons
                  name={recorderState.isRecording ? 'stop' : voiceUri ? 'check' : 'microphone'}
                  size={24}
                  color={colors.white}
                />
              </View>
              <View style={styles.recordCopy}>
                <Text style={styles.recordTitle}>
                  {recorderState.isRecording ? 'Stop recording' : voiceUri ? 'Voice note ready' : 'Record voice note'}
                </Text>
                <Text style={styles.recordDetail}>
                  {recorderState.isRecording
                    ? `${formatDuration(recorderState.durationMillis)} · recording`
                    : voiceUri
                      ? 'Tap to replace the recording'
                      : 'Audio stays with this draft until submission'}
                </Text>
              </View>
            </Pressable>
          </Field>
        )}

        <Field label="Incident location">
          <View style={styles.textField}>
            <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.navy} />
            <TextInput
              accessibilityLabel="Incident location"
              onChangeText={setLocation}
              placeholder="Area or street"
              placeholderTextColor="#99A2A9"
              style={styles.locationInput}
              value={location}
            />
          </View>
        </Field>

        <Field label="Is this happening now?">
          <View style={styles.choiceRow}>
            <Choice label="Yes" selected={happeningNow} onPress={() => setHappeningNow(true)} />
            <Choice label="No" selected={!happeningNow} onPress={() => setHappeningNow(false)} />
          </View>
        </Field>

        <Field label="Incident type" helper="Optional">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: typeMenuOpen }}
            onPress={() => setTypeMenuOpen((open) => !open)}
            style={({ pressed }) => [styles.selectField, pressed && styles.pressed]}
          >
            <Text style={[styles.selectText, !incidentType && styles.placeholderText]}>
              {incidentType || 'Select a type'}
            </Text>
            <MaterialCommunityIcons
              name={typeMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.muted}
            />
          </Pressable>
          {typeMenuOpen ? (
            <View style={styles.typeMenu}>
              {incidentTypes.map((type) => (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  onPress={() => {
                    setIncidentType(type);
                    setTypeMenuOpen(false);
                  }}
                  style={({ pressed }) => [styles.typeOption, pressed && styles.typeOptionPressed]}
                >
                  <Text style={styles.typeOptionText}>{type}</Text>
                  {incidentType === type ? (
                    <MaterialCommunityIcons name="check" size={19} color={colors.green} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="Photo or attachment" helper="Optional">
          <Pressable
            accessibilityRole="button"
            onPress={pickAttachment}
            style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}
          >
            {attachment ? (
              <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
            ) : (
              <View style={styles.attachmentIcon}>
                <MaterialCommunityIcons name="image-plus-outline" size={25} color={colors.navy} />
              </View>
            )}
            <View style={styles.attachmentCopy}>
              <Text numberOfLines={1} style={styles.attachmentTitle}>
                {attachment?.name ?? 'Add a supporting photo'}
              </Text>
              <Text style={styles.attachmentDetail}>{attachment ? 'Tap to replace' : 'Choose from this device'}</Text>
            </View>
            {attachment ? (
              <Pressable
                accessibilityLabel="Remove attachment"
                accessibilityRole="button"
                hitSlop={10}
                onPress={(event) => {
                  event.stopPropagation();
                  setAttachment(null);
                }}
              >
                <MaterialCommunityIcons name="close-circle" size={23} color={colors.muted} />
              </Pressable>
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
            )}
          </Pressable>
        </Field>

        <Pressable
          accessibilityRole="button"
          disabled={recorderState.isRecording}
          onPress={submit}
          style={({ pressed }) => [
            styles.submitButton,
            recorderState.isRecording && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons name="send-outline" size={22} color={colors.white} />
          <Text style={styles.submitText}>Submit demo report</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={requestAssistance}
          style={({ pressed }) => [styles.assistanceButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="phone-outline" size={21} color={colors.navy} />
          <Text style={styles.assistanceText}>Call for assistance</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Demo data only. Reports are not transmitted until a secure community-safety backend is connected.
        </Text>
      </ScrollView>
    </View>
  );
}

function ModeButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.modeButton, selected && styles.modeButtonSelected]}
    >
      <MaterialCommunityIcons name={icon as never} size={20} color={selected ? colors.white : colors.navy} />
      <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldTitleRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function formatDuration(durationMillis: number) {
  const seconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 19, paddingBottom: 30 },
  eyebrow: { color: '#A51E2C', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  heading: { marginTop: 3, color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: '900' },
  intro: { marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 17 },
  warningCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.redSoft,
  },
  warningText: { flex: 1, color: '#7C1B25', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  modeSwitch: { marginTop: 17, flexDirection: 'row', gap: 8 },
  modeButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.white,
  },
  modeButtonSelected: { backgroundColor: colors.navy },
  modeText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  modeTextSelected: { color: colors.white },
  field: { marginTop: 18 },
  fieldTitleRow: { marginBottom: 6, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  fieldHelper: { color: colors.muted, fontSize: 10 },
  summaryWrap: {
    minHeight: 132,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  summaryInput: { minHeight: 105, padding: 11, color: colors.ink, fontSize: 12, lineHeight: 17 },
  counter: { position: 'absolute', right: 8, bottom: 6, color: colors.muted, fontSize: 9 },
  recordButton: {
    minHeight: 74,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  recordButtonActive: { borderColor: colors.red, backgroundColor: '#FFF5F6' },
  recordIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  recordIconActive: { backgroundColor: colors.red },
  recordCopy: { flex: 1, marginLeft: 12 },
  recordTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  recordDetail: { marginTop: 4, color: colors.muted, fontSize: 10 },
  textField: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  locationInput: { flex: 1, marginLeft: 7, color: colors.ink, fontSize: 12 },
  choiceRow: { flexDirection: 'row', gap: 9 },
  choice: {
    flex: 1,
    minHeight: 47,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  choiceSelected: { borderColor: colors.navy, backgroundColor: '#EAF2F7' },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#87939B',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.navy },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.navy },
  choiceText: { marginLeft: 8, color: colors.muted, fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: colors.navy },
  selectField: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  selectText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' },
  placeholderText: { color: '#8D989F', fontWeight: '500' },
  typeMenu: {
    marginTop: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  typeOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeOptionPressed: { backgroundColor: '#EEF3F6' },
  typeOptionText: { flex: 1, color: colors.ink, fontSize: 12 },
  attachment: {
    minHeight: 62,
    padding: 9,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  attachmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2F7',
  },
  attachmentImage: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#E4E9EC' },
  attachmentCopy: { flex: 1, marginLeft: 10 },
  attachmentTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  attachmentDetail: { marginTop: 3, color: colors.muted, fontSize: 9 },
  submitButton: {
    minHeight: 52,
    marginTop: 23,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.navy,
  },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  assistanceButton: {
    minHeight: 50,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
  },
  assistanceText: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  buttonDisabled: { opacity: 0.45 },
  footerNote: { marginTop: 12, color: colors.muted, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
