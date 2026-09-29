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
  ActivityIndicator,
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
import {
  createSubmissionId,
  type IncidentSubmissionResult,
  submitIncident,
} from '../api/incidents';
import { AppHeader } from '../components/AppHeader';
import { colors } from '../theme';

type ReportScreenProps = { navigate: (route: Route) => void };
type InputMode = 'text' | 'voice';

export function ReportScreen({ navigate }: ReportScreenProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<{ uri: string; name: string } | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState(createSubmissionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedReport, setSavedReport] = useState<IncidentSubmissionResult | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);

  const handleBack = async () => {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
    }
    navigate('home');
  };

  const toggleRecording = async () => {
    if (isSubmitting || savedReport) {
      return;
    }

    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        setVoiceUri(audioRecorder.uri ?? null);
        return;
      }

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission needed', 'Allow microphone access to record for transcription.');
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceUri(null);
    } catch {
      Alert.alert('Voice recording unavailable', 'The recording could not be started on this device.');
    }
  };

  const pickAttachment = async () => {
    if (isSubmitting || savedReport) {
      return;
    }

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

  const updateDescription = (nextDescription: string) => {
    if (nextDescription !== description && !isSubmitting && !savedReport) {
      setSubmissionId(createSubmissionId());
      setErrorMessage(null);
    }
    setDescription(nextDescription);
  };

  const submit = async () => {
    if (isSubmitting || savedReport || recorderState.isRecording) {
      return;
    }

    const trimmedLength = description.trim().length;
    if (trimmedLength < 10) {
      setErrorMessage('Write at least 10 characters so the incident can be understood.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const report = await submitIncident(description, submissionId);
      setSavedReport(report);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The report could not be submitted right now.';
      setErrorMessage(
        `${detail} Your paragraph is still here. Retrying this draft will not create a duplicate.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAnotherReport = () => {
    setDescription('');
    setInputMode('text');
    setAttachment(null);
    setVoiceUri(null);
    setSubmissionId(createSubmissionId());
    setSavedReport(null);
    setErrorMessage(null);
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
        <Text style={styles.heading}>What happened?</Text>
        <Text style={styles.intro}>
          Describe the incident in one paragraph. Include only details you can confirm; the system will organise the information for review.
        </Text>

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
            label="Voice to text"
            selected={inputMode === 'voice'}
            onPress={() => setInputMode('voice')}
          />
        </View>

        {inputMode === 'voice' ? (
          <Field label="Voice recording" helper="Kept on this device">
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || Boolean(savedReport)}
              onPress={toggleRecording}
              style={({ pressed }) => [
                styles.recordButton,
                recorderState.isRecording && styles.recordButtonActive,
                (isSubmitting || Boolean(savedReport)) && styles.buttonDisabled,
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
                  {recorderState.isRecording
                    ? 'Stop recording'
                    : voiceUri
                      ? 'Voice recording ready'
                      : 'Record for transcription'}
                </Text>
                <Text style={styles.recordDetail}>
                  {recorderState.isRecording
                    ? `${formatDuration(recorderState.durationMillis)} · recording`
                    : voiceUri
                      ? 'Tap to replace this recording'
                      : 'The transcript becomes the report paragraph'}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.transcriptionNote}>
              Automatic speech transcription is not connected yet. Review or type the transcript below before submitting.
            </Text>
          </Field>
        ) : null}

        <Field
          label={inputMode === 'voice' ? 'Editable transcript' : 'Incident description'}
          helper="10–5,000 characters"
        >
          <DescriptionEditor
            description={description}
            disabled={isSubmitting || Boolean(savedReport)}
            hasError={Boolean(errorMessage && !savedReport)}
            onChange={updateDescription}
          />
        </Field>

        <Field label="Photo or attachment" helper="Optional · kept on this device">
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting || Boolean(savedReport)}
            onPress={pickAttachment}
            style={({ pressed }) => [
              styles.attachment,
              (isSubmitting || Boolean(savedReport)) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
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
              <Text style={styles.attachmentDetail}>
                {attachment ? 'Tap to replace' : 'Choose from this device'}
              </Text>
            </View>
            {attachment && !isSubmitting && !savedReport ? (
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

        {errorMessage ? (
          <View accessibilityLiveRegion="polite" style={styles.errorCard}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#A51E2C" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {savedReport ? (
          <View accessibilityLiveRegion="polite" style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle-outline" size={25} color={colors.green} />
            <View style={styles.stateCopy}>
              <Text style={styles.successTitle}>Report saved</Text>
              <Text selectable style={styles.referenceText}>Reference: {savedReport.reference}</Text>
              <Text style={styles.successDetail}>{getSuccessDetail(savedReport)}</Text>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isSubmitting, disabled: isSubmitting || recorderState.isRecording }}
            disabled={isSubmitting || recorderState.isRecording}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              (isSubmitting || recorderState.isRecording) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <MaterialCommunityIcons name="send-outline" size={22} color={colors.white} />
            )}
            <Text style={styles.submitText}>{isSubmitting ? 'Saving report…' : 'Submit report'}</Text>
          </Pressable>
        )}

        {savedReport ? (
          <Pressable
            accessibilityRole="button"
            onPress={startAnotherReport}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Report another incident</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={requestAssistance}
          style={({ pressed }) => [styles.assistanceButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="phone-outline" size={21} color={colors.navy} />
          <Text style={styles.assistanceText}>Call for assistance</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          Reports are stored as unverified community submissions. Submitting does not contact emergency responders.
        </Text>
      </ScrollView>
    </View>
  );
}

function DescriptionEditor({
  description,
  disabled,
  hasError,
  onChange,
}: {
  description: string;
  disabled: boolean;
  hasError: boolean;
  onChange: (description: string) => void;
}) {
  return (
    <View style={[styles.summaryWrap, hasError && styles.summaryError]}>
      <TextInput
        accessibilityLabel="Incident description"
        editable={!disabled}
        maxLength={5_000}
        multiline
        onChangeText={onChange}
        placeholder="For example: Two people robbed me near the station last night and took my phone."
        placeholderTextColor="#8D989F"
        style={styles.summaryInput}
        textAlignVertical="top"
        value={description}
      />
      <Text style={styles.counter}>{description.length}/5,000</Text>
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

function formatDuration(durationMillis: number) {
  const seconds = Math.max(0, Math.floor(durationMillis / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function getSuccessDetail(report: IncidentSubmissionResult) {
  if (report.extractionStatus === 'failed') {
    return 'The original paragraph is saved and remains unverified. Structured extraction could not be completed; do not resubmit this report.';
  }
  if (report.extractionStatus === 'pending') {
    return 'The original paragraph is saved and remains unverified. Structured processing is still pending; do not resubmit this report.';
  }
  return 'The original paragraph and its mock-extracted details are saved. The report remains unverified.';
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
  fieldTitleRow: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
  },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  fieldHelper: { color: colors.muted, fontSize: 10 },
  summaryWrap: {
    minHeight: 208,
    borderWidth: 1.5,
    borderColor: '#C9D0D5',
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  summaryError: { borderColor: '#C9414E' },
  summaryInput: { minHeight: 180, padding: 12, color: colors.ink, fontSize: 13, lineHeight: 19 },
  counter: { position: 'absolute', right: 9, bottom: 7, color: colors.muted, fontSize: 9 },
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
  transcriptionNote: { marginTop: 7, color: colors.muted, fontSize: 9, lineHeight: 13 },
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
  errorCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.redSoft,
  },
  errorText: { flex: 1, color: '#7C1B25', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  successCard: {
    marginTop: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7E0BD',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.greenSoft,
  },
  stateCopy: { flex: 1 },
  successTitle: { color: '#087437', fontSize: 15, fontWeight: '900' },
  referenceText: { marginTop: 4, color: colors.ink, fontSize: 12, fontWeight: '900' },
  successDetail: { marginTop: 4, color: '#26583A', fontSize: 10, lineHeight: 15 },
  submitButton: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.navy,
  },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minHeight: 50,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryText: { color: colors.green, fontSize: 14, fontWeight: '900' },
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
  buttonDisabled: { opacity: 0.55 },
  footerNote: { marginTop: 12, color: colors.muted, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
