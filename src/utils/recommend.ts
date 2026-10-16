import type { AudienceAge, EntertainmentStyle, Service } from '@/models';

export interface PlannerInput {
  eventTypeId?: string;
  cityId?: string;
  date?: string;
  attendees?: number;
  audience?: AudienceAge;
  budget?: number;
  style?: EntertainmentStyle;
  durationMinutes?: number;
}

export type MatchReason = 'eventType' | 'city' | 'audience' | 'budget' | 'style' | 'capacity' | 'duration';

export interface Recommendation {
  service: Service;
  score: number;
  reasons: MatchReason[];
  /** Hard mismatches that would block a booking (e.g. city not served). */
  blockers: MatchReason[];
}

/**
 * Transparent rule-based scoring (no ML). City and event type are hard
 * requirements; the rest add to the score.
 */
export function recommendServices(services: Service[], input: PlannerInput): Recommendation[] {
  return services
    .map((service) => {
      const reasons: MatchReason[] = [];
      const blockers: MatchReason[] = [];
      let score = service.rating;

      if (input.eventTypeId) {
        if (service.eventTypeIds.includes(input.eventTypeId)) { reasons.push('eventType'); score += 4; }
        else blockers.push('eventType');
      }
      if (input.cityId) {
        if (service.cityIds.includes(input.cityId)) { reasons.push('city'); score += 3; }
        else blockers.push('city');
      }
      if (input.audience) {
        if (service.audience.includes(input.audience)) { reasons.push('audience'); score += 3; }
        else if (service.audience.includes('all')) score += 1;
        else score -= 3;
      }
      if (input.budget) {
        if (service.startingPrice <= input.budget) { reasons.push('budget'); score += 2; }
        else score -= 4;
      }
      if (input.style) {
        if (service.styles.includes(input.style)) { reasons.push('style'); score += 2; }
      }
      if (input.attendees) {
        if (service.packages.some((p) => p.maxAttendees >= input.attendees!)) { reasons.push('capacity'); score += 1; }
        else score -= 3;
      }
      if (input.durationMinutes) {
        const close = service.packages.some((p) => Math.abs(p.durationMinutes - input.durationMinutes!) <= 30);
        if (close) { reasons.push('duration'); score += 1; }
      }
      return { service, score, reasons, blockers };
    })
    .filter((r) => r.blockers.length === 0)
    .sort((a, b) => b.score - a.score);
}
