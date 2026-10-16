import { describe, expect, it } from 'vitest';
import { services } from '@/services/mock/services-data';
import { contactSchema, dateIssue, eventSchema } from './schemas';

const service = services.find((s) => s.id === 'svc-clown-bobo')!;
const today = '2026-10-14';
const valid = { eventTypeId: 'birthday', date: '2026-10-20', startTime: '17:00', extraHours: 0, cityId: 'riyadh', venue: 'Home', attendees: 20, notes: '' };

describe('booking validation', () => {
  it('rejects past, too-soon and too-far dates', () => {
    expect(dateIssue('2026-10-01', today)).toBe('validation.datePast');
    expect(dateIssue('2026-10-15', today)).toBe('validation.dateTooSoon');
    expect(dateIssue('2027-12-01', today)).toBe('validation.dateTooFar');
    expect(dateIssue('2026-02-30', today)).toBe('validation.date');
    expect(dateIssue('2026-10-20', today)).toBeNull();
  });

  it('accepts a complete event and rejects unsupported city or event type', () => {
    const schema = eventSchema(service, today);
    expect(schema.safeParse(valid).success).toBe(true);
    const bad = schema.safeParse({ ...valid, cityId: 'nowhere', eventTypeId: 'wedding', venue: '', attendees: 0 });
    expect(bad.success).toBe(false);
    const messages = bad.success ? [] : bad.error.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(['validation.cityNotServed', 'validation.eventTypeNotSupported', 'validation.venue', 'validation.attendees']));
  });

  it('normalizes the phone number and lower-cases the email', () => {
    const r = contactSchema.parse({ fullName: 'Sara Ali', phone: '055 123 4567', email: 'Sara@Example.com', contactMethod: 'whatsapp' });
    expect(r.phone).toBe('+966551234567');
    expect(r.email).toBe('sara@example.com');
  });
});
