import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findNearestThirdParty,
  resolveAssistanceContacts,
} from '../assistance/contacts';
import { suburbs } from '../../shared/safetyMap';

test('assistance contacts are validated, normalized and restricted to known areas', () => {
  const contacts = resolveAssistanceContacts({
    SAPS_CALL_LABEL: 'Configured test line',
    SAPS_CALL_NUMBER: '+27 (11) 000-0001',
    ASSISTANCE_DEMO_MODE: 'true',
    THIRD_PARTY_ORGANIZATIONS_JSON: JSON.stringify([
      {
        id: 'partner-one',
        name: 'Partner One',
        phoneNumber: '+27 11 000 0002',
        latitude: -26.193,
        longitude: 28.0342,
        areaIds: ['braamfontein'],
      },
    ]),
  });

  assert.deepEqual(contacts.primary, {
    id: 'saps-configured-line',
    name: 'Configured test line',
    phoneNumber: '+27110000001',
  });
  assert.equal(contacts.demoMode, true);
  assert.equal(contacts.thirdParties[0]?.phoneNumber, '+27110000002');
  assert.deepEqual(contacts.thirdParties[0]?.areaIds, ['braamfontein']);
});

test('nearest assistance contact excludes inactive and out-of-area organizations', () => {
  const area = suburbs.find((candidate) => candidate.id === 'braamfontein')!;
  const nearest = findNearestThirdParty(
    [
      {
        id: 'inactive-nearby',
        name: 'Inactive Nearby',
        phoneNumber: '+27110000004',
        latitude: area.latitude,
        longitude: area.longitude,
        active: false,
        areaIds: [],
      },
      {
        id: 'wrong-area',
        name: 'Wrong Area',
        phoneNumber: '+27110000005',
        latitude: area.latitude,
        longitude: area.longitude,
        active: true,
        areaIds: ['parktown'],
      },
      {
        id: 'eligible',
        name: 'Eligible Partner',
        phoneNumber: '+27110000006',
        latitude: -26.194,
        longitude: 28.035,
        active: true,
        areaIds: ['braamfontein'],
      },
    ],
    area,
  );

  assert.equal(nearest?.contact.id, 'eligible');
  assert.ok((nearest?.distanceMeters ?? 0) > 0);
});

test('invalid assistance phone numbers fail configuration', () => {
  assert.throws(
    () => resolveAssistanceContacts({ SAPS_CALL_NUMBER: 'not-a-number' }),
    /phone numbers/,
  );
});
