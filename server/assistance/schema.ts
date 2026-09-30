import { z } from 'zod';

import { suburbs } from '../../shared/safetyMap';

const identifierSchema = z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9-]+$/);

export const startAssistanceRequestSchema = z
  .object({
    reportingSessionId: identifierSchema,
    areaId: z.string().refine((value) => suburbs.some((area) => area.id === value)),
  })
  .strict();

export const primaryOutcomeSchema = z
  .object({
    answered: z.boolean(),
    helpResponse: z.enum(['coming', 'not_coming', 'unsure']),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.answered && value.helpResponse !== 'not_coming') {
      context.addIssue({
        code: 'custom',
        path: ['helpResponse'],
        message: 'An unanswered call must use not_coming.',
      });
    }
  });

export const linkAssistanceReportSchema = z
  .object({
    reportReference: z.string().trim().min(6).max(80).regex(/^ILWA-[A-Z0-9-]+$/),
  })
  .strict();
