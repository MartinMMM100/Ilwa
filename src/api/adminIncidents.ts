export type AdminIncidentCategory =
  | 'robbery'
  | 'theft'
  | 'vandalism'
  | 'assault'
  | 'vehicle_theft'
  | 'suspicious_activity'
  | 'infrastructure_fault'
  | 'other_unclear';

export type AdminIncidentDetails = {
  category: AdminIncidentCategory;
  locationText: string | null;
  timeText: string | null;
  itemsTaken: string[];
  offenderCount: number | null;
  weaponReported: string | null;
  injuriesReported: string | null;
  isOngoing: boolean | null;
};

export type AdminIncident = {
  _id?: string;
  submissionId: string;
  reportReference: string;
  reporterId: string;
  isDemoData?: boolean;
  originalDescription: string;
  reportedAt: string;
  updatedAt: string;
  status: 'submitted';
  verificationStatus: 'unverified';
  extractionStatus: 'pending' | 'completed' | 'failed';
  extractionMethod: 'mock-v1' | 'openai-responses-v1';
  extractionModel: string | null;
  extractionFixtureMatched: boolean | null;
  extractedDetails: AdminIncidentDetails | null;
};

export async function fetchAdminIncidents(): Promise<AdminIncident[]> {
  const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const response = await fetch(`${apiBaseUrl}/api/admin/incidents`);

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => null);
    const message = readErrorMessage(errorBody) ?? 'The incidents could not be retrieved.';
    throw new Error(message);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || !('incidents' in data) || !Array.isArray(data.incidents)) {
    throw new Error('The server returned an unexpected incident list.');
  }

  return data.incidents as AdminIncident[];
}

function readErrorMessage(value: unknown): string | null {
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
  return null;
}
