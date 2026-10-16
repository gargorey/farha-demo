import { z } from 'zod';
import { businessConfig } from '@/config/business';
import type { Service } from '@/models';
import { daysBetween, isValidISODate, todayISO } from '@/utils/dates';
import { normalizeSaudiMobile } from '@/utils/phone';

/**
 * Validation schemas. Messages are i18n keys (rendered with t()), so the
 * same rules produce Arabic or English messages.
 */
const { minLeadDays, maxAdvanceDays, maxAttendees } = businessConfig.booking;

export const validationParams: Record<string, Record<string, number>> = {
  'validation.dateTooSoon': { days: minLeadDays },
  'validation.dateTooFar': { days: maxAdvanceDays },
  'validation.attendees': { max: maxAttendees },
};

export function dateIssue(value: string, today = todayISO()): string | null {
  if (!isValidISODate(value)) return 'validation.date';
  const diff = daysBetween(today, value);
  if (diff < 0) return 'validation.datePast';
  if (diff < minLeadDays) return 'validation.dateTooSoon';
  if (diff > maxAdvanceDays) return 'validation.dateTooFar';
  return null;
}

export const eventSchema = (service: Pick<Service, 'eventTypeIds' | 'cityIds' | 'maxExtraHours'>, today?: string) =>
  z.object({
    eventTypeId: z
      .string()
      .min(1, 'validation.eventType')
      .refine((v) => service.eventTypeIds.includes(v), 'validation.eventTypeNotSupported'),
    date: z.string().superRefine((v, ctx) => {
      const issue = dateIssue(v, today);
      if (issue) ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    }),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'validation.time'),
    extraHours: z.coerce.number().int().min(0).max(service.maxExtraHours),
    cityId: z
      .string()
      .min(1, 'validation.city')
      .refine((v) => service.cityIds.includes(v), 'validation.cityNotServed'),
    venue: z.string().trim().min(3, 'validation.venue').max(200, 'validation.venue'),
    attendees: z.coerce
      .number({ invalid_type_error: 'validation.attendees' })
      .int('validation.attendees')
      .min(1, 'validation.attendees')
      .max(maxAttendees, 'validation.attendees'),
    notes: z.string().trim().max(1000).optional(),
  });

export type EventFormValues = z.infer<ReturnType<typeof eventSchema>>;

export const contactSchema = z.object({
  fullName: z.string().trim().min(3, 'validation.name').max(100, 'validation.name'),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeSaudiMobile(v) !== null, 'validation.phone')
    .transform((v) => normalizeSaudiMobile(v) ?? v),
  email: z.string().trim().toLowerCase().email('validation.email'),
  contactMethod: z.enum(['phone', 'whatsapp', 'email']),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(3, 'validation.name'),
  email: z.string().trim().email('validation.email'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || normalizeSaudiMobile(v) !== null, 'validation.phone'),
  subject: z.string().min(1, 'validation.subject'),
  message: z.string().trim().min(10, 'validation.message').max(2000),
});

export type ContactMessageValues = z.infer<typeof contactMessageSchema>;
