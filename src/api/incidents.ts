import { Platform } from 'react-native';

export type IncidentSubmissionResult = {
  reference: string;
  status: 'submitted';
  verificationStatus: 'unverified';
  extractionStatus: 'pending' | 'completed' | 'failed';
};

export type IncidentPhotoAttachment = {
  uri: string;
  name: string;
  mediaType: string;
};

export function createSubmissionId() {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `incident-${Date.now().toString(36)}-${randomPart}`;
}

export async function submitIncident(
  description: string,
  submissionId: string,
): Promise<IncidentSubmissionResult> {
  const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const response = await fetch(`${apiBaseUrl}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, submissionId }),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readApiError(payload));
  }

  if (!isIncidentResponse(payload)) {
    throw new Error('The server returned an unexpected response.');
  }

  return payload.report;
}

export async function uploadIncidentPhoto(
  reportReference: string,
  attachment: IncidentPhotoAttachment,
) {
  const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const form = new FormData();

  if (Platform.OS === 'web') {
    const photoResponse = await fetch(attachment.uri);
    const photoBlob = await photoResponse.blob();
    form.append('photo', photoBlob, attachment.name);
  } else {
    form.append(
      'photo',
      {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.mediaType,
      } as unknown as Blob,
    );
  }

  const response = await fetch(
    `${apiBaseUrl}/api/incidents/${encodeURIComponent(reportReference)}/photo`,
    { method: 'POST', body: form },
  );
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(readApiError(payload));
  }
}

function isIncidentResponse(
  value: unknown,
): value is { report: IncidentSubmissionResult } {
  if (!value || typeof value !== 'object' || !('report' in value)) {
    return false;
  }

  const report = value.report;
  return Boolean(
    report &&
      typeof report === 'object' &&
      'reference' in report &&
      typeof report.reference === 'string' &&
      'status' in report &&
      report.status === 'submitted' &&
      'verificationStatus' in report &&
      report.verificationStatus === 'unverified' &&
      'extractionStatus' in report &&
      ['pending', 'completed', 'failed'].includes(String(report.extractionStatus)),
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
  return 'The report could not be submitted right now.';
}
