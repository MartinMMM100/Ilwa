import { getApiBaseUrl } from './baseUrl';

export type PublicFeedCategory = 'Crime' | 'Safety' | 'Community';
export type PublicFeedThreatLevel = 'unknown' | 'low' | 'medium' | 'high' | 'critical';

export type PublicFeedItem = {
  id: string;
  category: PublicFeedCategory;
  incidentType: string;
  title: string;
  location: string | null;
  details: {
    timeText: string | null;
    itemsTaken: string[];
    offenderCount: number | null;
    weaponReported: string | null;
    injuriesReported: string | null;
    isOngoing: boolean | null;
  };
  photoUrl: string | null;
  reportedAt: string;
  verificationStatus: 'unverified' | 'verified';
  threatLevel: PublicFeedThreatLevel;
  isDemoData: boolean;
};

export async function fetchPublicFeed(signal?: AbortSignal): Promise<PublicFeedItem[]> {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/feed?limit=30`, { signal });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(readApiError(payload));
  }
  if (!isFeedResponse(payload)) {
    throw new Error('The server returned an unexpected live feed.');
  }

  return payload.items.map((item) => ({
    ...item,
    photoUrl: item.photoUrl ? `${apiBaseUrl}${item.photoUrl}` : null,
  }));
}

function isFeedResponse(value: unknown): value is { items: PublicFeedItem[] } {
  if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) {
    return false;
  }

  return value.items.every((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return (
      'id' in item &&
      typeof item.id === 'string' &&
      'category' in item &&
      ['Crime', 'Safety', 'Community'].includes(String(item.category)) &&
      'incidentType' in item &&
      typeof item.incidentType === 'string' &&
      'title' in item &&
      typeof item.title === 'string' &&
      'location' in item &&
      (item.location === null || typeof item.location === 'string') &&
      'details' in item &&
      isFeedDetails(item.details) &&
      'photoUrl' in item &&
      (item.photoUrl === null || typeof item.photoUrl === 'string') &&
      'reportedAt' in item &&
      typeof item.reportedAt === 'string' &&
      !Number.isNaN(Date.parse(item.reportedAt)) &&
      'verificationStatus' in item &&
      (item.verificationStatus === 'unverified' || item.verificationStatus === 'verified') &&
      'threatLevel' in item &&
      ['unknown', 'low', 'medium', 'high', 'critical'].includes(String(item.threatLevel)) &&
      'isDemoData' in item &&
      typeof item.isDemoData === 'boolean'
    );
  });
}

function isFeedDetails(value: unknown): value is PublicFeedItem['details'] {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return (
    'timeText' in value &&
    (value.timeText === null || typeof value.timeText === 'string') &&
    'itemsTaken' in value &&
    Array.isArray(value.itemsTaken) &&
    value.itemsTaken.every((item) => typeof item === 'string') &&
    'offenderCount' in value &&
    (value.offenderCount === null || typeof value.offenderCount === 'number') &&
    'weaponReported' in value &&
    (value.weaponReported === null || typeof value.weaponReported === 'string') &&
    'injuriesReported' in value &&
    (value.injuriesReported === null || typeof value.injuriesReported === 'string') &&
    'isOngoing' in value &&
    (value.isOngoing === null || typeof value.isOngoing === 'boolean')
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
  return 'The live feed could not be loaded right now.';
}
