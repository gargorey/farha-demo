import { businessConfig } from '@/config/business';
import type { BookingHistoryEntry, BookingStatus, SelectedAddOn } from '@/models';
import { categories, cities } from '@/services/mock/reference-data';
import { services } from '@/services/mock/services-data';
import { addDays, todayISO } from '@/utils/dates';
import { calculatePricing } from '@/utils/pricing';
import type {
  AdminBooking,
  AdminCategory,
  AdminService,
  AuditEntry,
  BookingChannel,
  Customer,
  PricingSettings,
  Promotion,
  Provider,
  StaffUser,
} from '../models';

/**
 * DEMO DATA for the admin dashboard. Generated once per browser from a fixed seed
 * (so every demo looks the same) with dates relative to the day it is generated.
 * All names, phones and emails are fictional.
 */

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
  };
}

export const providerIdFor = (serviceId: string) => `prv-${serviceId.replace(/^svc-/, '')}`;

const FIRST = [
  ['سارة', 'Sara'], ['نورة', 'Noura'], ['ريم', 'Reem'], ['هيا', 'Haya'], ['لمى', 'Lama'], ['جواهر', 'Jawaher'],
  ['منيرة', 'Munira'], ['أمل', 'Amal'], ['عبدالله', 'Abdullah'], ['محمد', 'Mohammed'], ['فهد', 'Fahad'],
  ['خالد', 'Khalid'], ['سلطان', 'Sultan'], ['تركي', 'Turki'], ['فيصل', 'Faisal'], ['ماجد', 'Majed'],
  ['نواف', 'Nawaf'], ['دانة', 'Dana'], ['غادة', 'Ghada'], ['بندر', 'Bandar'],
] as const;
const LAST = [
  ['القحطاني', 'Alqahtani'], ['العتيبي', 'Alotaibi'], ['الشمري', 'Alshammari'], ['الدوسري', 'Aldosari'],
  ['الغامدي', 'Alghamdi'], ['الزهراني', 'Alzahrani'], ['الحربي', 'Alharbi'], ['المطيري', 'Almutairi'],
  ['السبيعي', 'Alsubaie'], ['العنزي', 'Alanazi'], ['الشهري', 'Alshehri'], ['البلوي', 'Albalawi'],
] as const;
const VENUES = [
  'منزل – حي الملقا', 'استراحة عائلية', 'قاعة الفيصلية', 'مدرسة الرواد الأهلية', 'Home – Al Nakheel', 'Hilton Garden Inn',
  'منزل – حي الياسمين', 'Office HQ – KAFD', 'حديقة الحي', 'Villa – Al Shati', 'قاعة الأفراح', 'Al Rashid Mall atrium',
];
const NOTES = [
  'Theme: space adventure', 'الحفلة لطفلة عمرها ٦ سنوات', 'Need parking for a van', 'الرجاء الحضور قبل الموعد بنصف ساعة',
  'Indoor venue, no smoke effects', 'نحتاج فقرة خاصة للعريس', '', '', '',
];
const STAFF_NAMES = ['Hima', 'Abdulaziz Alharbi', 'Lujain Alsaud', 'Omar Alghamdi', 'Reem Alotaibi'];

export interface AdminDataset {
  version: number;
  generatedAt: string;
  services: AdminService[];
  categories: AdminCategory[];
  providers: Provider[];
  customers: Customer[];
  bookings: AdminBooking[];
  promotions: Promotion[];
  staff: StaffUser[];
  settings: PricingSettings;
  audit: AuditEntry[];
}

export const DATASET_VERSION = 1;

export function generateDataset(now: Date = new Date()): AdminDataset {
  const r = rng(20261018);
  const today = todayISO(now);
  const iso = (offsetDays: number, hour = 10) => {
    const d = new Date(`${addDays(today, offsetDays)}T00:00:00`);
    d.setHours(hour, r.int(0, 59));
    return d.toISOString();
  };

  const adminServices: AdminService[] = services.map((s) => ({
    ...structuredClone(s),
    providerId: providerIdFor(s.id),
    active: true,
    updatedAt: iso(-200),
  }));

  const providers: Provider[] = services.map((s, i) => ({
    id: providerIdFor(s.id),
    name: { ar: s.providerName.ar.replace(/ ?\(مزود تجريبي\)/, ''), en: s.providerName.en.replace(/ ?\(demo provider\)/, '') },
    contactName: `${r.pick(FIRST)[1]} ${r.pick(LAST)[1]}`,
    phone: `+9665${String(10000000 + i * 7654321).slice(0, 8)}`,
    email: `partners+${s.slug}@farha.example`,
    cityIds: [...s.cityIds],
    status: i === 13 ? 'pending' : i === 9 ? 'suspended' : 'active',
    commissionRate: [0.15, 0.15, 0.12, 0.18, 0.15][i % 5],
    joinedAt: iso(-400 + i * 11),
  }));

  const customers: Customer[] = Array.from({ length: 46 }, (_, i) => {
    const [fa, fe] = FIRST[i % FIRST.length];
    const [la, le] = LAST[(i * 7) % LAST.length];
    const arabic = i % 3 !== 2;
    return {
      id: `cus-${String(i + 1).padStart(3, '0')}`,
      fullName: arabic ? `${fa} ${la}` : `${fe} ${le}`,
      phone: `+9665${String(50000000 + i * 1371177).slice(0, 8)}`,
      email: `${fe.toLowerCase()}.${le.toLowerCase()}${i}@example.com`,
      cityId: r.pick(['riyadh', 'riyadh', 'riyadh', 'jeddah', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah', 'abha']),
      createdAt: iso(-r.int(30, 380)),
      tags: i % 9 === 0 ? ['vip'] : i % 11 === 3 ? ['corporate'] : [],
      blocked: i === 44,
    };
  });

  const channels: BookingChannel[] = ['website', 'website', 'website', 'whatsapp', 'whatsapp', 'phone'];
  const bookings: AdminBooking[] = [];
  const COUNT = 150;
  for (let i = 0; i < COUNT; i++) {
    // Spread events from ~6 months ago to ~2 months ahead, busier recently.
    const offset = Math.round(-185 + Math.pow(r.next(), 0.8) * 245);
    const service = r.pick(services);
    const pkg = r.pick(service.packages);
    const cityId = r.pick(service.cityIds);
    const city = cities.find((c) => c.id === cityId)!;
    const customer = customers[(i * 13 + r.int(0, 45)) % customers.length];
    const addOns: SelectedAddOn[] = service.addOns.filter(() => r.chance(0.25)).map((a) => ({ addOnId: a.id, quantity: a.quantifiable ? r.int(1, a.maxQuantity) : 1 }));
    const extraHours = service.extraHourPrice && r.chance(0.15) ? 1 : 0;
    const createdOffset = offset - r.int(3, 35);
    const createdRaw = iso(Math.min(createdOffset, 0), r.int(8, 22));
    const created = new Date(Math.min(new Date(createdRaw).getTime(), now.getTime() - 3 * 3_600_000)).toISOString();

    let status: BookingStatus;
    if (offset < 0) status = r.chance(0.86) ? 'completed' : 'cancelled';
    else if (offset <= 2) status = r.chance(0.9) ? 'confirmed' : 'cancellation_requested';
    else {
      const roll = r.next();
      status = roll < 0.18 ? 'pending_request' : roll < 0.32 ? 'pending_confirmation' : roll < 0.86 ? 'confirmed' : roll < 0.93 ? 'cancellation_requested' : 'cancelled';
    }

    const path: [BookingStatus, string][] = [['pending_request', 'history.submitted']];
    const add = (s: BookingStatus, key: string) => path.push([s, key]);
    if (status !== 'pending_request') add('pending_confirmation', 'history.staffReviewing');
    if (['confirmed', 'completed', 'cancellation_requested'].includes(status)) add('confirmed', 'history.staffConfirmed');
    if (status === 'completed') add('completed', 'history.staffCompleted');
    if (status === 'cancellation_requested') add('cancellation_requested', 'history.cancellationRequested');
    if (status === 'cancelled') {
      if (r.chance(0.5)) add('cancelled', 'history.staffRejected');
      else {
        add('confirmed', 'history.staffConfirmed');
        add('cancellation_requested', 'history.cancellationRequested');
        add('cancelled', 'history.staffCancellationApproved');
      }
    }
    const createdMs = new Date(created).getTime();
    const lastMs = Math.max(createdMs, Math.min(now.getTime(), new Date(iso(offset + 1)).getTime()));
    const history: BookingHistoryEntry[] = path.map(([s, noteKey], idx) => ({
      at: new Date(createdMs + ((lastMs - createdMs) * idx) / Math.max(1, path.length)).toISOString(),
      status: s,
      noteKey,
    }));

    const ref = `FR-${(0x2b7c1 + i * 7919).toString(36).toUpperCase().slice(-6).padStart(6, 'X')}`;
    bookings.push({
      id: `bk-${String(i + 1).padStart(4, '0')}`,
      reference: `DEMO-${ref}`,
      isDemo: true,
      status,
      selection: { serviceId: service.id, packageId: pkg.id, addOns },
      event: {
        eventTypeId: r.pick(service.eventTypeIds),
        date: addDays(today, offset),
        startTime: r.pick(['10:00', '16:00', '17:00', '18:00', '19:00', '20:00']),
        extraHours,
        cityId,
        venue: r.pick(VENUES),
        attendees: Math.max(5, Math.min(pkg.maxAttendees, r.int(10, 120))),
        notes: r.pick(NOTES) || undefined,
      },
      customer: { fullName: customer.fullName, phone: customer.phone, email: customer.email, contactMethod: r.pick(['whatsapp', 'phone', 'email'] as const) },
      pricing: calculatePricing({ service, packageId: pkg.id, addOns, extraHours, city }),
      createdAt: created,
      updatedAt: history[history.length - 1].at,
      history,
      channel: r.pick(channels),
      origin: 'sample',
      ...(status === 'confirmed' && offset > 5 && i % 6 === 0
        ? { modificationRequest: { message: r.pick(['Please move the start time to 18:00', 'نرغب بإضافة ١٠ ضيوف', 'Can we change the venue to the garden?']), requestedAt: iso(-1) } }
        : {}),
    });
  }

  const adminCategories: AdminCategory[] = categories.map((c) => ({ ...structuredClone(c), active: true }));

  const promotions: Promotion[] = [
    { id: 'promo-1', code: 'NATIONAL95', name: { ar: 'عرض اليوم الوطني', en: 'National Day offer' }, kind: 'percent', value: 15, minSubtotal: 1500, startsOn: addDays(today, -30), endsOn: addDays(today, 20), maxUses: 200, uses: 37, active: true, categoryIds: [] },
    { id: 'promo-2', code: 'SCHOOL300', name: { ar: 'خصم المدارس', en: 'Schools discount' }, kind: 'fixed', value: 300, minSubtotal: 3000, startsOn: addDays(today, -60), endsOn: addDays(today, 90), uses: 12, active: true, categoryIds: ['cat-interactive', 'cat-variety'] },
    { id: 'promo-3', code: 'BUBBLES10', name: { ar: 'عرض الفقاعات', en: 'Bubble shows promo' }, kind: 'percent', value: 10, minSubtotal: 0, startsOn: addDays(today, -120), endsOn: addDays(today, -40), maxUses: 100, uses: 100, active: false, categoryIds: ['cat-bubbles'] },
    { id: 'promo-4', code: 'WELCOME', name: { ar: 'ترحيب بالعملاء الجدد', en: 'New customer welcome' }, kind: 'percent', value: 5, minSubtotal: 800, startsOn: addDays(today, 5), endsOn: addDays(today, 120), uses: 0, active: true, categoryIds: [] },
  ];

  const staff: StaffUser[] = [
    { id: 'usr-1', name: STAFF_NAMES[0], email: 'owner@farha.example', role: 'admin', active: true, lastActiveAt: iso(0, 9) },
    { id: 'usr-2', name: STAFF_NAMES[1], email: 'ops@farha.example', role: 'operations', active: true, lastActiveAt: iso(0, 8) },
    { id: 'usr-3', name: STAFF_NAMES[2], email: 'finance@farha.example', role: 'finance', active: true, lastActiveAt: iso(-1, 15) },
    { id: 'usr-4', name: STAFF_NAMES[3], email: 'support@farha.example', role: 'operations', active: true, lastActiveAt: iso(-2, 11) },
    { id: 'usr-5', name: STAFF_NAMES[4], email: 'viewer@farha.example', role: 'viewer', active: false },
  ];

  const settings: PricingSettings = {
    vat: { ...businessConfig.pricing.vat },
    applyTravelFee: businessConfig.pricing.applyTravelFee,
    travelFees: Object.fromEntries(cities.map((c) => [c.id, c.travelFee])),
    minLeadDays: businessConfig.booking.minLeadDays,
    maxAdvanceDays: businessConfig.booking.maxAdvanceDays,
    cancellationCutoffHours: businessConfig.policy.cancellationCutoffHours,
    modificationCutoffHours: businessConfig.policy.modificationCutoffHours,
    freeWithdrawalBeforeConfirmation: businessConfig.policy.freeWithdrawalBeforeConfirmation,
    defaultCommissionRate: 0.15,
  };

  return {
    version: DATASET_VERSION,
    generatedAt: now.toISOString(),
    services: adminServices,
    categories: adminCategories,
    providers,
    customers,
    bookings: bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    promotions,
    staff,
    settings,
    audit: [
      { id: 'aud-1', at: iso(-1, 16), by: STAFF_NAMES[1], action: 'booking.confirm', target: bookings[3].reference },
      { id: 'aud-2', at: iso(-2, 12), by: STAFF_NAMES[2], action: 'promotion.create', target: 'NATIONAL95' },
      { id: 'aud-3', at: iso(-3, 10), by: STAFF_NAMES[0], action: 'pricing.update', target: 'VAT 15%' },
    ],
  };
}
