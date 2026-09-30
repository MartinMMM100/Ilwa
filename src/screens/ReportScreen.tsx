import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
  createReportingSessionId,
  type FallbackContactPreview,
  linkAssistanceToReport,
  savePrimaryCallOutcome,
  startAssistanceRequest,
  startThirdPartyCall,
} from '../api/assistance';
import {
  createSubmissionId,
  type IncidentPhotoAttachment,
  type IncidentSubmissionResult,
  submitIncident,
  uploadIncidentPhoto,
} from '../api/incidents';
import { transcribeIncidentAudio } from '../api/transcriptions';
import { AppHeader } from '../components/AppHeader';
import { SuburbPicker } from '../components/SuburbPicker';
import { landmarkOptions } from '../../shared/safetyMap';
import { useAreaMap } from '../map/AreaProvider';
import { colors } from '../theme';

type ReportScreenProps = { navigate: (route: Route) => void };
type InputMode = 'text' | 'voice';
type AssistanceStage =
  | 'idle'
  | 'confirm'
  | 'primary_call'
  | 'primary_outcome'
  | 'help_response'
  | 'fallback_ready'
  | 'complete';

export function ReportScreen({ navigate }: ReportScreenProps) {
  const { area } = useAreaMap();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [description, setDescription] = useState('');
  const [mapLocationId, setMapLocationId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<IncidentPhotoAttachment | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<'uploaded' | 'failed' | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState(createSubmissionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedReport, setSavedReport] = useState<IncidentSubmissionResult | null>(null);
  const [reportingSessionId, setReportingSessionId] = useState(createReportingSessionId);
  const [assistanceRequestId, setAssistanceRequestId] = useState<string | null>(null);
  const [primaryContactName, setPrimaryContactName] = useState('SAPS');
  const [primaryContactNumber, setPrimaryContactNumber] = useState<string | null>(null);
  const [assistanceDemoMode, setAssistanceDemoMode] = useState(false);
  const [assistanceStage, setAssistanceStage] = useState<AssistanceStage>('idle');
  const [fallbackContact, setFallbackContact] = useState<FallbackContactPreview | null>(null);
  const [assistanceMessage, setAssistanceMessage] = useState<string | null>(null);
  const [assistanceError, setAssistanceError] = useState<string | null>(null);
  const [assistanceBusy, setAssistanceBusy] = useState(false);
  const leftForPrimaryCall = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (assistanceStage !== 'primary_call') return;
      if (nextState !== 'active') {
        leftForPrimaryCall.current = true;
        return;
      }
      if (leftForPrimaryCall.current) {
        leftForPrimaryCall.current = false;
        setAssistanceStage('primary_outcome');
      }
    });
    return () => subscription.remove();
  }, [assistanceStage]);

  const transcribeVoiceRecording = async (recordingUri: string) => {
    setIsTranscribing(true);
    setTranscriptionFailed(false);
    setErrorMessage(null);

    try {
      const transcript = await transcribeIncidentAudio(recordingUri);
      setDescription(transcript);
      setSubmissionId(createSubmissionId());

      const transcriptLength = transcript.trim().length;
      if (transcriptLength < 10 || transcriptLength > 5_000) {
        setErrorMessage(
          'The transcript must be between 10 and 5,000 characters. Edit it before submitting.',
        );
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'The recording could not be transcribed.';
      setTranscriptionFailed(true);
      setErrorMessage(
        `${detail} The recording is still available so you can retry or type the transcript.`,
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleBack = async () => {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
    }
    navigate('home');
  };

  const toggleRecording = async () => {
    if (isSubmitting || isTranscribing || savedReport) {
      return;
    }

    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        const recordingUri = audioRecorder.uri;
        setVoiceUri(recordingUri ?? null);
        if (!recordingUri) {
          throw new Error('The device did not provide the completed recording.');
        }
        await transcribeVoiceRecording(recordingUri);
        return;
      }

      if (transcriptionFailed && voiceUri) {
        await transcribeVoiceRecording(voiceUri);
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
      setTranscriptionFailed(false);
      setErrorMessage(null);
    } catch {
      Alert.alert('Voice recording unavailable', 'The recording could not be started on this device.');
    }
  };

  const pickAttachment = async () => {
    if (isSubmitting || isTranscribing || savedReport) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setErrorMessage('Choose a photo that is 5 MB or smaller.');
        return;
      }
      const name = asset.fileName ?? 'incident-photo.jpg';
      setAttachment({
        uri: asset.uri,
        name,
        mediaType: asset.mimeType ?? inferImageMediaType(name),
      });
      setPhotoUploadStatus(null);
      setErrorMessage(null);
    }
  };

  const updateDescription = (nextDescription: string) => {
    if (nextDescription !== description && !isSubmitting && !isTranscribing && !savedReport) {
      setSubmissionId(createSubmissionId());
      setErrorMessage(null);
    }
    setDescription(nextDescription);
  };

  const submit = async () => {
    if (isSubmitting || isTranscribing || savedReport || recorderState.isRecording) {
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
      const report = await submitIncident(description, submissionId, mapLocationId);
      if (attachment) {
        try {
          await uploadIncidentPhoto(report.reference, attachment);
          setPhotoUploadStatus('uploaded');
        } catch (photoError) {
          setPhotoUploadStatus('failed');
          const detail =
            photoError instanceof Error ? photoError.message : 'The photo could not be uploaded.';
          setErrorMessage(`${detail} The incident report itself was saved successfully.`);
        }
      }
      if (assistanceRequestId) {
        try {
          await linkAssistanceToReport(assistanceRequestId, report.reference);
        } catch {
          setAssistanceError(
            'The report was saved, but its earlier call record could not be linked. The call record remains stored.',
          );
        }
      }
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
    setMapLocationId(null);
    setInputMode('text');
    setAttachment(null);
    setPhotoUploadStatus(null);
    setVoiceUri(null);
    setTranscriptionFailed(false);
    setSubmissionId(createSubmissionId());
    setReportingSessionId(createReportingSessionId());
    setSavedReport(null);
    setErrorMessage(null);
    setAssistanceRequestId(null);
    setPrimaryContactName('SAPS');
    setPrimaryContactNumber(null);
    setAssistanceDemoMode(false);
    setAssistanceStage('idle');
    setFallbackContact(null);
    setAssistanceMessage(null);
    setAssistanceError(null);
    leftForPrimaryCall.current = false;
  };

  const requestAssistance = () => {
    setAssistanceError(null);
    setAssistanceMessage(null);
    setAssistanceStage('confirm');
  };

  const openPrimaryCall = async () => {
    if (assistanceBusy) return;
    setAssistanceBusy(true);
    setAssistanceError(null);
    setAssistanceMessage(null);
    setFallbackContact(null);
    try {
      const result = await startAssistanceRequest(reportingSessionId, area.id);
      setAssistanceRequestId(result.assistance.requestId);
      setPrimaryContactName(result.contact.name);
      setPrimaryContactNumber(result.contact.phoneNumber);
      setAssistanceDemoMode(result.demoMode);
      leftForPrimaryCall.current = false;
      setAssistanceStage('primary_call');
      if (!result.demoMode) {
        await Linking.openURL(`tel:${result.contact.phoneNumber}`);
      }
    } catch (error) {
      setAssistanceError(
        error instanceof Error ? error.message : 'The assistance call could not be opened.',
      );
    } finally {
      setAssistanceBusy(false);
    }
  };

  const recordPrimaryOutcome = async (
    answered: boolean,
    helpResponse: 'coming' | 'not_coming' | 'unsure',
  ) => {
    if (!assistanceRequestId || assistanceBusy) return;
    setAssistanceBusy(true);
    setAssistanceError(null);
    try {
      const result = await savePrimaryCallOutcome(
        assistanceRequestId,
        answered,
        helpResponse,
      );
      if (!result.needsFallback) {
        setFallbackContact(null);
        setAssistanceMessage(
          `${primaryContactName} was recorded as coming to help. The response was saved.`,
        );
        setAssistanceStage('complete');
        return;
      }
      if (!result.fallbackContact) {
        setFallbackContact(null);
        setAssistanceMessage(
          'The response was saved, but no active third-party organization is configured for this area.',
        );
        setAssistanceStage('complete');
        return;
      }
      setFallbackContact(result.fallbackContact);
      setAssistanceMessage('The response was saved. A fallback organization is available.');
      setAssistanceStage('fallback_ready');
    } catch (error) {
      setAssistanceError(
        error instanceof Error ? error.message : 'The call response could not be saved.',
      );
    } finally {
      setAssistanceBusy(false);
    }
  };

  const openThirdPartyCall = async () => {
    if (!assistanceRequestId || assistanceBusy) return;
    setAssistanceBusy(true);
    setAssistanceError(null);
    try {
      const result = await startThirdPartyCall(assistanceRequestId);
      const contact = result.contact;
      setAssistanceMessage(
        result.demoMode
          ? `Demo call to ${contact.name} (${contact.phoneNumber}) was saved. No real call was placed.`
          : `The call to ${contact.name} was saved and opened in your dialer.`,
      );
      setAssistanceStage('complete');
      if (!result.demoMode) {
        await Linking.openURL(`tel:${contact.phoneNumber}`);
      }
    } catch (error) {
      setAssistanceError(
        error instanceof Error ? error.message : 'The organization call could not be opened.',
      );
    } finally {
      setAssistanceBusy(false);
    }
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
          <Field label="Voice recording" helper="Uploaded temporarily for transcription">
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || isTranscribing || Boolean(savedReport)}
              onPress={toggleRecording}
              style={({ pressed }) => [
                styles.recordButton,
                recorderState.isRecording && styles.recordButtonActive,
                (isSubmitting || isTranscribing || Boolean(savedReport)) && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.recordIcon, recorderState.isRecording && styles.recordIconActive]}>
                {isTranscribing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <MaterialCommunityIcons
                    name={
                      recorderState.isRecording
                        ? 'stop'
                        : transcriptionFailed
                          ? 'refresh'
                          : voiceUri
                            ? 'check'
                            : 'microphone'
                    }
                    size={24}
                    color={colors.white}
                  />
                )}
              </View>
              <View style={styles.recordCopy}>
                <Text style={styles.recordTitle}>
                  {recorderState.isRecording
                    ? 'Stop recording'
                    : isTranscribing
                      ? 'Transcribing recording…'
                      : transcriptionFailed
                        ? 'Retry transcription'
                        : voiceUri
                          ? 'Transcript ready for review'
                      : 'Record for transcription'}
                </Text>
                <Text style={styles.recordDetail}>
                  {recorderState.isRecording
                    ? `${formatDuration(recorderState.durationMillis)} · recording`
                    : isTranscribing
                      ? 'Keep this screen open while the audio is processed'
                      : transcriptionFailed
                        ? 'Tap to send the same recording again'
                        : voiceUri
                          ? 'Review and edit the paragraph below before submitting'
                          : 'The transcript becomes an editable report paragraph'}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.transcriptionNote}>
              The recording is sent to the transcription service and is not stored in MongoDB. Always review the text below before submitting.
            </Text>
            {transcriptionFailed && voiceUri ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setVoiceUri(null);
                  setTranscriptionFailed(false);
                  setErrorMessage(null);
                }}
                style={({ pressed }) => [
                  styles.discardRecordingButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.discardRecordingText}>Discard and record again</Text>
              </Pressable>
            ) : null}
          </Field>
        ) : null}

        <Field
          label={inputMode === 'voice' ? 'Editable transcript' : 'Incident description'}
          helper="10–5,000 characters"
        >
          <DescriptionEditor
            description={description}
            disabled={isSubmitting || isTranscribing || Boolean(savedReport)}
            hasError={Boolean(errorMessage && !savedReport)}
            onChange={updateDescription}
          />
        </Field>

        <Field label="Where did it happen?" helper="Optional · shows the report on the map">
          <View style={styles.placeRow}>
            {landmarkOptions.map((place) => {
              const selected = mapLocationId === place.id;
              const locked = isSubmitting || isTranscribing || Boolean(savedReport);
              return (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={locked}
                  onPress={() => {
                    setMapLocationId(selected ? null : place.id);
                    setSubmissionId(createSubmissionId());
                  }}
                  style={[styles.placeChip, selected && styles.placeChipSelected, locked && styles.buttonDisabled]}
                >
                  <Text style={[styles.placeChipText, selected && styles.placeChipTextSelected]}>{place.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Photo or attachment" helper="Optional · up to 5 MB">
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting || isTranscribing || Boolean(savedReport)}
            onPress={pickAttachment}
            style={({ pressed }) => [
              styles.attachment,
              (isSubmitting || isTranscribing || Boolean(savedReport)) && styles.buttonDisabled,
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
              <Text style={styles.successDetail}>
                {getSuccessDetail(savedReport, photoUploadStatus)}
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy: isSubmitting || isTranscribing,
              disabled: isSubmitting || isTranscribing || recorderState.isRecording,
            }}
            disabled={isSubmitting || isTranscribing || recorderState.isRecording}
            onPress={submit}
            style={({ pressed }) => [
              styles.submitButton,
              (isSubmitting || isTranscribing || recorderState.isRecording) &&
                styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSubmitting || isTranscribing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <MaterialCommunityIcons name="send-outline" size={22} color={colors.white} />
            )}
            <Text style={styles.submitText}>
              {isSubmitting
                ? 'Saving report…'
                : isTranscribing
                  ? 'Transcribing…'
                  : 'Submit report'}
            </Text>
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

        <View style={styles.assistanceAreaWrap}>
          <Text style={styles.assistanceAreaLabel}>Assistance area</Text>
          {assistanceRequestId ? (
            <Text style={styles.assistanceAreaLocked}>⌖  {area.name} · locked for this call</Text>
          ) : (
            <SuburbPicker />
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: assistanceBusy,
            disabled: assistanceBusy || assistanceStage !== 'idle',
          }}
          disabled={assistanceBusy || assistanceStage !== 'idle'}
          onPress={requestAssistance}
          style={({ pressed }) => [
            styles.assistanceButton,
            (assistanceBusy || assistanceStage !== 'idle') && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          {assistanceBusy && assistanceStage === 'idle' ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <MaterialCommunityIcons name="phone-outline" size={21} color={colors.navy} />
          )}
          <Text style={styles.assistanceText}>
            {assistanceRequestId
              ? 'Assistance call started'
              : assistanceStage === 'confirm'
                ? 'Confirm assistance call below'
                : 'Call for assistance'}
          </Text>
        </Pressable>

        {assistanceStage !== 'idle' || assistanceError ? (
          <View style={styles.assistanceCard}>
            <View style={styles.assistanceTitleRow}>
              <MaterialCommunityIcons name="phone-check-outline" size={22} color={colors.navy} />
              <Text style={styles.assistanceCardTitle}>Call follow-up</Text>
            </View>

            {assistanceStage === 'confirm' ? (
              <>
                <Text style={styles.assistancePrompt}>
                  This will save a call attempt for {area.name} and start the configured assistance flow.
                </Text>
                <View style={styles.answerRow}>
                  <ChoiceButton
                    label="Cancel"
                    disabled={assistanceBusy}
                    onPress={() => setAssistanceStage('idle')}
                  />
                  <ChoiceButton
                    label="Continue"
                    disabled={assistanceBusy}
                    onPress={() => void openPrimaryCall()}
                  />
                </View>
              </>
            ) : null}

            {assistanceStage === 'primary_call' ? (
              <>
                <Text style={styles.assistancePrompt}>
                  {assistanceDemoMode
                    ? `Demo call to ${primaryContactName}${primaryContactNumber ? ` (${primaryContactNumber})` : ''} was saved. No real call was placed; choose a sample outcome below.`
                    : `The call attempt was saved. When your call to ${primaryContactName} ends, return here to record what happened.`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setAssistanceStage('primary_outcome')}
                  style={({ pressed }) => [styles.outcomeButton, pressed && styles.pressed]}
                >
                  <Text style={styles.outcomeButtonText}>
                    {assistanceDemoMode ? 'Choose demo outcome' : 'Record call outcome'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {assistanceStage === 'primary_outcome' ? (
              <>
                <Text style={styles.assistanceQuestion}>Did {primaryContactName} answer?</Text>
                <View style={styles.answerRow}>
                  <ChoiceButton
                    label="No"
                    disabled={assistanceBusy}
                    onPress={() => void recordPrimaryOutcome(false, 'not_coming')}
                  />
                  <ChoiceButton
                    label="Yes"
                    disabled={assistanceBusy}
                    onPress={() => setAssistanceStage('help_response')}
                  />
                </View>
              </>
            ) : null}

            {assistanceStage === 'help_response' ? (
              <>
                <Text style={styles.assistanceQuestion}>Are they coming to help?</Text>
                <View style={styles.answerRow}>
                  <ChoiceButton
                    label="Yes"
                    disabled={assistanceBusy}
                    onPress={() => void recordPrimaryOutcome(true, 'coming')}
                  />
                  <ChoiceButton
                    label="No"
                    disabled={assistanceBusy}
                    onPress={() => void recordPrimaryOutcome(true, 'not_coming')}
                  />
                  <ChoiceButton
                    label="Unsure"
                    disabled={assistanceBusy}
                    onPress={() => void recordPrimaryOutcome(true, 'unsure')}
                  />
                </View>
              </>
            ) : null}

            {assistanceStage === 'fallback_ready' && fallbackContact ? (
              <>
                <Text style={styles.assistanceQuestion}>Closest configured organization</Text>
                <Text style={styles.fallbackName}>{fallbackContact.name}</Text>
                <Text style={styles.fallbackDistance}>
                  Approximately {formatDistance(fallbackContact.distanceMeters)} from {area.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={assistanceBusy}
                  onPress={() => void openThirdPartyCall()}
                  style={({ pressed }) => [
                    styles.outcomeButton,
                    assistanceBusy && styles.buttonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {assistanceBusy ? <ActivityIndicator color={colors.white} /> : null}
                  <Text style={styles.outcomeButtonText}>Call {fallbackContact.name}</Text>
                </Pressable>
              </>
            ) : null}

            {assistanceStage === 'complete' && assistanceMessage ? (
              <View accessibilityLiveRegion="polite" style={styles.assistanceSavedRow}>
                <MaterialCommunityIcons name="database-check-outline" size={20} color={colors.green} />
                <Text style={styles.assistanceSavedText}>{assistanceMessage}</Text>
              </View>
            ) : null}

            {assistanceError ? (
              <View accessibilityLiveRegion="polite" style={styles.assistanceErrorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={19} color="#A51E2C" />
                <Text style={styles.assistanceErrorText}>{assistanceError}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.footerNote}>
          Reports are stored as unverified community submissions. Demo calls save sample data without contacting a real number.
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

function ChoiceButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceButton,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.choiceButtonText}>{label}</Text>
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

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1_000).toFixed(1)} km`;
}

function getSuccessDetail(
  report: IncidentSubmissionResult,
  photoUploadStatus: 'uploaded' | 'failed' | null,
) {
  const photoDetail =
    photoUploadStatus === 'uploaded'
      ? ' The supporting photo was uploaded.'
      : photoUploadStatus === 'failed'
        ? ' The report was saved, but its photo was not uploaded.'
        : '';
  if (report.extractionStatus === 'failed') {
    return `The original paragraph is saved and remains unverified. Structured extraction could not be completed; do not resubmit this report.${photoDetail}`;
  }
  if (report.extractionStatus === 'pending') {
    return `The original paragraph is saved and remains unverified. Structured processing is still pending; do not resubmit this report.${photoDetail}`;
  }
  return `The original paragraph and its structured details are saved. The report remains unverified.${photoDetail}`;
}

function inferImageMediaType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  if (extension === 'heif') return 'image/heif';
  return 'image/jpeg';
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
  placeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  placeChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  placeChipSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  placeChipText: { color: colors.navy, fontSize: 12, fontWeight: '700' },
  placeChipTextSelected: { color: colors.white },
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
  discardRecordingButton: { alignSelf: 'flex-start', marginTop: 7, paddingVertical: 4 },
  discardRecordingText: { color: colors.navy, fontSize: 10, fontWeight: '800' },
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
  assistanceAreaWrap: { marginTop: 15 },
  assistanceAreaLabel: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  assistanceAreaLocked: {
    marginTop: 7,
    padding: 12,
    borderRadius: 9,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: colors.white,
  },
  assistanceText: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  assistanceCard: {
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFCED8',
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  assistanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assistanceCardTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  assistancePrompt: { marginTop: 9, color: colors.muted, fontSize: 11, lineHeight: 16 },
  assistanceQuestion: { marginTop: 10, color: colors.ink, fontSize: 13, fontWeight: '900' },
  answerRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  choiceButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  choiceButtonText: { color: colors.navy, fontSize: 12, fontWeight: '900' },
  outcomeButton: {
    minHeight: 44,
    marginTop: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.navy,
  },
  outcomeButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  fallbackName: { marginTop: 7, color: colors.navy, fontSize: 15, fontWeight: '900' },
  fallbackDistance: { marginTop: 3, color: colors.muted, fontSize: 10 },
  assistanceSavedRow: { marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  assistanceSavedText: { flex: 1, color: '#26583A', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  assistanceErrorRow: {
    marginTop: 10,
    padding: 9,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: colors.redSoft,
  },
  assistanceErrorText: { flex: 1, color: '#7C1B25', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  footerNote: { marginTop: 12, color: colors.muted, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
