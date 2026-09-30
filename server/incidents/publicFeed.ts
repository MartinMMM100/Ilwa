import type { IncidentDocument } from './model';
import type { IncidentDetails } from './schema';
import type { ThreatLevel } from './threatAssessment';

export type PublicFeedCategory = 'Crime' | 'Safety' | 'Community';

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
  verificationStatus: 'unverified';
  threatLevel: ThreatLevel;
  isDemoData: boolean;
};

const categoryPresentation: Record<
  IncidentDetails['category'],
  { feedCategory: PublicFeedCategory; label: string }
> = {
  robbery: { feedCategory: 'Crime', label: 'Robbery' },
  theft: { feedCategory: 'Crime', label: 'Theft' },
  assault: { feedCategory: 'Crime', label: 'Assault' },
  vehicle_theft: { feedCategory: 'Crime', label: 'Vehicle theft' },
  suspicious_activity: { feedCategory: 'Safety', label: 'Suspicious activity' },
  infrastructure_fault: { feedCategory: 'Safety', label: 'Infrastructure fault' },
  vandalism: { feedCategory: 'Community', label: 'Vandalism' },
  other_unclear: { feedCategory: 'Community', label: 'Community report' },
};

export function toPublicFeedItem(incident: IncidentDocument): PublicFeedItem | null {
  if (incident.extractionStatus !== 'completed' || !incident.extractedDetails) {
    return null;
  }

  const details = incident.extractedDetails;
  const presentation = categoryPresentation[details.category];
  const location = details.locationText?.trim() || null;

  return {
    id: incident.reportReference,
    category: presentation.feedCategory,
    incidentType: presentation.label,
    title: location
      ? `${presentation.label} reported ${normaliseLocation(location)}`
      : `${presentation.label} reported in the community`,
    location,
    details: {
      timeText: details.timeText,
      itemsTaken: [...details.itemsTaken],
      offenderCount: details.offenderCount,
      weaponReported: details.weaponReported,
      injuriesReported: details.injuriesReported,
      isOngoing: details.isOngoing,
    },
    photoUrl: incident.photo
      ? `/api/feed/${encodeURIComponent(incident.reportReference)}/photo`
      : null,
    reportedAt: incident.reportedAt.toISOString(),
    verificationStatus: incident.verificationStatus,
    threatLevel: incident.threatLevel,
    isDemoData: incident.isDemoData ?? false,
  };
}

function normaliseLocation(location: string) {
  const firstCharacter = location.charAt(0);
  if (!firstCharacter) {
    return location;
  }
  return `${firstCharacter.toLowerCase()}${location.slice(1)}`;
}
