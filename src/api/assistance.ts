import { getApiBaseUrl } from './baseUrl';

export type AssistanceContact = {
  id: string;
  name: string;
  phoneNumber: string;
};

export type FallbackContactPreview = {
  id: string;
  name: string;
  distanceMeters: number;
};

export type AssistanceRequest = {
  requestId: string;
  reportingSessionId: string;
  status: string;
};

export function createReportingSessionId() {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `assistance-${Date.now().toString(36)}-${randomPart}`;
}

export async function startAssistanceRequest(
  reportingSessionId: string,
  areaId: string,
): Promise<{ assistance: AssistanceRequest; contact: AssistanceContact; demoMode: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/api/assistance-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportingSessionId, areaId }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readApiError(payload));
  if (!isStartResponse(payload)) {
    throw new Error('The server returned an unexpected assistance response.');
  }
  return payload;
}

export async function savePrimaryCallOutcome(
  requestId: string,
  answered: boolean,
  helpResponse: 'coming' | 'not_coming' | 'unsure',
): Promise<{
  needsFallback: boolean;
  fallbackContact: FallbackContactPreview | null;
}> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/assistance-requests/${encodeURIComponent(requestId)}/primary-outcome`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answered, helpResponse }),
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readApiError(payload));
  if (!isOutcomeResponse(payload)) {
    throw new Error('The server returned an unexpected call outcome.');
  }
  return {
    needsFallback: payload.needsFallback,
    fallbackContact: payload.fallbackContact,
  };
}

export async function startThirdPartyCall(
  requestId: string,
): Promise<{
  contact: AssistanceContact & { distanceMeters: number };
  demoMode: boolean;
}> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/assistance-requests/${encodeURIComponent(requestId)}/third-party-call`,
    { method: 'POST' },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readApiError(payload));
  if (!isThirdPartyResponse(payload)) {
    throw new Error('The server returned an unexpected organization contact.');
  }
  return payload;
}

export async function linkAssistanceToReport(requestId: string, reportReference: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/assistance-requests/${encodeURIComponent(requestId)}/report`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportReference }),
    },
  );
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(readApiError(payload));
  }
}

function isStartResponse(
  value: unknown,
): value is { assistance: AssistanceRequest; contact: AssistanceContact; demoMode: boolean } {
  if (!value || typeof value !== 'object' || !('assistance' in value) || !('contact' in value)) {
    return false;
  }
  const assistance = value.assistance;
  const contact = value.contact;
  return Boolean(
    assistance &&
      typeof assistance === 'object' &&
      'requestId' in assistance &&
      typeof assistance.requestId === 'string' &&
      'reportingSessionId' in assistance &&
      typeof assistance.reportingSessionId === 'string' &&
      'status' in assistance &&
      typeof assistance.status === 'string' &&
      isContact(contact) &&
      'demoMode' in value &&
      typeof value.demoMode === 'boolean',
  );
}

function isOutcomeResponse(
  value: unknown,
): value is { needsFallback: boolean; fallbackContact: FallbackContactPreview | null } {
  if (!value || typeof value !== 'object' || !('needsFallback' in value)) return false;
  if (typeof value.needsFallback !== 'boolean' || !('fallbackContact' in value)) return false;
  const contact = value.fallbackContact;
  return (
    contact === null ||
    Boolean(
      contact &&
        typeof contact === 'object' &&
        'id' in contact &&
        typeof contact.id === 'string' &&
        'name' in contact &&
        typeof contact.name === 'string' &&
        'distanceMeters' in contact &&
        typeof contact.distanceMeters === 'number',
    )
  );
}

function isThirdPartyResponse(
  value: unknown,
): value is {
  contact: AssistanceContact & { distanceMeters: number };
  demoMode: boolean;
} {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'contact' in value &&
      isContact(value.contact) &&
      'distanceMeters' in value.contact &&
      typeof value.contact.distanceMeters === 'number' &&
      'demoMode' in value &&
      typeof value.demoMode === 'boolean',
  );
}

function isContact(value: unknown): value is AssistanceContact {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      'name' in value &&
      typeof value.name === 'string' &&
      'phoneNumber' in value &&
      typeof value.phoneNumber === 'string',
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
  return 'The assistance request could not be completed.';
}
