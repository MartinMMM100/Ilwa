import type { IncidentDetails } from './schema';

export type ThreatLevel = 'unknown' | 'low' | 'medium' | 'high' | 'critical';
export type ThreatAssessmentMethod = 'rules-v1';

export type ThreatAssessment = {
  level: ThreatLevel;
  method: ThreatAssessmentMethod;
};

/**
 * Temporary, deterministic threat assessment. Replace this function when an AI-backed
 * assessor is introduced; the incident storage and map-query workflow can stay unchanged.
 */
export function assessIncidentThreat(details: IncidentDetails): ThreatAssessment {
  const reportsImmediateHarm =
    details.weaponReported !== null || details.injuriesReported !== null;
  const isViolentCategory = details.category === 'robbery' || details.category === 'assault';

  if (details.isOngoing === true && (reportsImmediateHarm || isViolentCategory)) {
    return { level: 'critical', method: 'rules-v1' };
  }

  if (reportsImmediateHarm || isViolentCategory) {
    return { level: 'high', method: 'rules-v1' };
  }

  if (
    details.isOngoing === true ||
    details.category === 'theft' ||
    details.category === 'vehicle_theft' ||
    details.category === 'vandalism' ||
    details.category === 'suspicious_activity'
  ) {
    return { level: 'medium', method: 'rules-v1' };
  }

  if (details.category === 'infrastructure_fault') {
    return { level: 'low', method: 'rules-v1' };
  }

  return { level: 'unknown', method: 'rules-v1' };
}
