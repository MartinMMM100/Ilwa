import { z } from 'zod';

import { suburbs, type AreaId, type Suburb } from '../../shared/safetyMap';

export type AssistanceContact = {
  id: string;
  name: string;
  phoneNumber: string;
  latitude: number;
  longitude: number;
  active: boolean;
  areaIds: AreaId[];
};

export type AssistanceContacts = {
  primary: Pick<AssistanceContact, 'id' | 'name' | 'phoneNumber'> | null;
  thirdParties: AssistanceContact[];
  demoMode: boolean;
};

const thirdPartySchema = z
  .object({
    id: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
    name: z.string().trim().min(2).max(120),
    phoneNumber: z.string().trim().min(3).max(32),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    active: z.boolean().default(true),
    areaIds: z.array(z.string()).max(suburbs.length).default([]),
  })
  .strict();

export function resolveAssistanceContacts(environment: NodeJS.ProcessEnv): AssistanceContacts {
  const demoMode = environment.ASSISTANCE_DEMO_MODE?.trim().toLowerCase() === 'true';
  const primaryNumber = environment.SAPS_CALL_NUMBER?.trim();
  const primary = primaryNumber
    ? {
        id: 'saps-configured-line',
        name: environment.SAPS_CALL_LABEL?.trim() || 'SAPS',
        phoneNumber: normalizePhoneNumber(primaryNumber),
      }
    : null;

  const rawThirdParties = environment.THIRD_PARTY_ORGANIZATIONS_JSON?.trim() || '[]';
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawThirdParties);
  } catch {
    throw new Error('THIRD_PARTY_ORGANIZATIONS_JSON must be valid JSON.');
  }

  const parsed = z.array(thirdPartySchema).max(100).parse(decoded);
  const ids = new Set<string>();
  const thirdParties = parsed.map((contact) => {
    if (ids.has(contact.id)) {
      throw new Error(`Duplicate third-party organization id: ${contact.id}`);
    }
    ids.add(contact.id);
    const areaIds = contact.areaIds.map((areaId) => {
      if (!isAreaId(areaId)) {
        throw new Error(`Unknown area id for ${contact.id}: ${areaId}`);
      }
      return areaId;
    });
    return {
      ...contact,
      phoneNumber: normalizePhoneNumber(contact.phoneNumber),
      areaIds,
    };
  });

  return { primary, thirdParties, demoMode };
}

export function findNearestThirdParty(
  contacts: AssistanceContact[],
  area: Suburb,
) {
  const candidates = contacts
    .filter(
      (contact) =>
        contact.active && (contact.areaIds.length === 0 || contact.areaIds.includes(area.id)),
    )
    .map((contact) => ({
      contact,
      distanceMeters: Math.round(
        distanceMeters(
          area.latitude,
          area.longitude,
          contact.latitude,
          contact.longitude,
        ),
      ),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.contact.name.localeCompare(b.contact.name));

  return candidates[0] ?? null;
}

function normalizePhoneNumber(value: string) {
  const normalized = value.replace(/[\s()-]/g, '');
  if (!/^\+?\d{3,15}$/.test(normalized)) {
    throw new Error('Assistance phone numbers must contain 3 to 15 digits and an optional leading +.');
  }
  return normalized;
}

function isAreaId(value: string): value is AreaId {
  return suburbs.some((area) => area.id === value);
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = Math.PI / 180;
  const deltaLatitude = (latitudeB - latitudeA) * radians;
  const deltaLongitude = (longitudeB - longitudeA) * radians;
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA * radians) *
      Math.cos(latitudeB * radians) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}
