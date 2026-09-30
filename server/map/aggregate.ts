import type { AreaId, ConcernZone, MapSnapshot } from '../../shared/safetyMap';
import type { IncidentDocument } from '../incidents/model';
import { findDemoLocationById, resolveDemoLocation } from './demoLocations';

const DAY = 86_400_000;
const weights: Record<string, number> = { robbery: 5, assault: 5, vehicle_theft: 3, theft: 2, vandalism: 1, suspicious_activity: 1, infrastructure_fault: 1, other_unclear: 0.5 };

export function aggregateDemoMap(incidents: IncidentDocument[], areaId: AreaId, now = new Date()): MapSnapshot {
  const grouped = new Map<string, ConcernZone>();
  if (areaId === 'braamfontein') for (const incident of incidents) {
    // Only demo reports, or real reports the reporter pinned to a known landmark, are used.
    // Raw text, reporter ids and unpinned real reports never reach the map.
    if ((incident.isDemoData !== true && !incident.mapLocationId) || incident.extractionStatus !== 'completed' || !incident.extractedDetails) continue;
    const age = now.getTime() - new Date(incident.reportedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > 30 * DAY) continue;
    const location = findDemoLocationById(incident.mapLocationId) ??
      (incident.isDemoData === true ? resolveDemoLocation(incident.extractedDetails.locationText) : undefined);
    if (!location) continue;
    const zone = grouped.get(location.id) ?? {
      id: location.id, label: location.label, latitude: location.latitude, longitude: location.longitude,
      radiusMeters: 180, concern: 'lower', reportCount: 0, score: 0,
      categories: [], lastReportedAt: new Date(incident.reportedAt).toISOString(),
    };
    zone.reportCount += 1;
    // Demo-only heuristic: category weight with a 14-day half-life, based on submission time.
    zone.score += (weights[incident.extractedDetails.category] ?? 0.5) * Math.pow(0.5, age / (14 * DAY));
    if (!zone.categories.includes(incident.extractedDetails.category)) zone.categories.push(incident.extractedDetails.category);
    const reportedAt = new Date(incident.reportedAt).toISOString();
    if (reportedAt > zone.lastReportedAt) zone.lastReportedAt = reportedAt;
    grouped.set(location.id, zone);
  }
  const zones = [...grouped.values()].map((zone) => ({ ...zone,
    score: Math.round(zone.score * 100) / 100,
    concern: zone.score >= 8 ? 'higher' as const : zone.score >= 3 ? 'elevated' as const : 'lower' as const,
    radiusMeters: Math.min(300, 140 + zone.reportCount * 15),
  }));
  return { areaId, demo: true, generatedAt: now.toISOString(), windowDays: 30, zones };
}
