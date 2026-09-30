import { Platform } from 'react-native';
import { getApiBaseUrl } from './baseUrl';

type TranscriptionResponse = {
  transcript: string;
};

export async function transcribeIncidentAudio(audioUri: string): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const audioResponse = await fetch(audioUri);
    if (!audioResponse.ok) {
      throw new Error('The recorded audio could not be prepared for transcription.');
    }
    const blob = await audioResponse.blob();
    formData.append('audio', blob, getWebFileName(blob.type));
  } else {
    formData.append(
      'audio',
      {
        uri: audioUri,
        name: 'incident-report.m4a',
        type: 'audio/mp4',
      } as unknown as Blob,
    );
  }

  const response = await fetch(`${getApiBaseUrl()}/api/transcriptions`, {
    method: 'POST',
    body: formData,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readApiError(payload));
  }
  if (!isTranscriptionResponse(payload)) {
    throw new Error('The server returned an unexpected transcription response.');
  }

  return payload.transcript;
}

function getWebFileName(mediaType: string) {
  if (mediaType.includes('mp4') || mediaType.includes('m4a')) {
    return 'incident-report.m4a';
  }
  if (mediaType.includes('wav')) {
    return 'incident-report.wav';
  }
  return 'incident-report.webm';
}

function isTranscriptionResponse(value: unknown): value is TranscriptionResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'transcript' in value &&
      typeof value.transcript === 'string' &&
      value.transcript.trim(),
  );
}

function readApiError(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    value.error &&
    typeof value.error === 'object' &&
    'message' in value.error &&
    typeof value.error.message === 'string'
  ) {
    return value.error.message;
  }
  return 'The recording could not be transcribed right now.';
}
