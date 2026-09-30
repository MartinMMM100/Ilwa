import { z } from 'zod';

export const suburbs = [
  { id: 'braamfontein', name: 'Braamfontein', latitude: -26.1929, longitude: 28.0341 },
  { id: 'parktown', name: 'Parktown', latitude: -26.1780, longitude: 28.0380 },
  { id: 'newtown', name: 'Newtown', latitude: -26.2030, longitude: 28.0280 },
  { id: 'johannesburg-cbd', name: 'Johannesburg CBD', latitude: -26.2050, longitude: 28.0420 },
  { id: 'hillbrow', name: 'Hillbrow', latitude: -26.1880, longitude: 28.0490 },
  { id: 'melville', name: 'Melville', latitude: -26.1750, longitude: 28.0090 },
  { id: 'fordsburg', name: 'Fordsburg', latitude: -26.2040, longitude: 28.0170 },
] as const;
export type Suburb = (typeof suburbs)[number];
export type AreaId = Suburb['id'];
export const concernLabels = { lower: 'Lower reported concern', elevated: 'Elevated reported concern', higher: 'Higher reported concern' };
export const concernColors = { lower: '39,135,91', elevated: '211,154,22', higher: '217,59,55' };

export const mapSnapshotSchema = z.object({
  areaId: z.string(), demo: z.literal(true), generatedAt: z.iso.datetime(), windowDays: z.literal(30),
  zones: z.array(z.object({
    id: z.string(), label: z.string(), latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180), radiusMeters: z.number().min(100).max(1000),
    concern: z.enum(['lower', 'elevated', 'higher']), reportCount: z.number().int().positive(),
    score: z.number().nonnegative(), lastReportedAt: z.iso.datetime(),
    categories: z.array(z.string()),
  })).max(64),
});
export type MapSnapshot = z.infer<typeof mapSnapshotSchema>;
export type ConcernZone = MapSnapshot['zones'][number];
