import { z } from 'zod';

export const incidentRequestSchema = z
  .object({
    description: z
      .string()
      .max(5_000, 'Incident description must be 5,000 characters or fewer.')
      .refine((value) => value.trim().length >= 10, 'Incident description must be at least 10 characters.'),
    submissionId: z
      .string()
      .min(8)
      .max(128)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
        'Submission identifier contains unsupported characters.',
      ),
  })
  .strict();

const nullableText = z.string().min(1).max(500).nullable();

export const incidentDetailsSchema = z
  .object({
    category: z.enum([
      'robbery',
      'theft',
      'vandalism',
      'assault',
      'vehicle_theft',
      'suspicious_activity',
      'infrastructure_fault',
      'other_unclear',
    ]),
    locationText: nullableText,
    timeText: nullableText,
    itemsTaken: z.array(z.string().min(1).max(200)).max(100),
    offenderCount: z.number().int().nonnegative().max(1_000).nullable(),
    weaponReported: nullableText,
    injuriesReported: nullableText,
    isOngoing: z.boolean().nullable(),
  })
  .strict();

export type IncidentDetails = z.infer<typeof incidentDetailsSchema>;
export type IncidentRequest = z.infer<typeof incidentRequestSchema>;
