import { generateDataset } from '@/admin/data/seed';
import { cities, eventTypes } from '@/services/mock/reference-data';
import { hashPassword } from '../lib/security';
import { tx, type Db } from './pool';

export interface SeedOptions {
  /** Sample customers, bookings, promotions and staff from the demo. Never for a live site. */
  sampleData: boolean;
  /** Password for the sample staff accounts (sample data only). */
  sampleStaffPassword?: string;
}

/**
 * Loads the starting catalogue (categories, services, providers, cities, settings)
 * from the website's demo data. Safe to run twice: existing rows are left alone.
 */
export async function seed(db: Db, opts: SeedOptions): Promise<{ inserted: boolean }> {
  const data = generateDataset();
  return tx(db, async (c) => {
    const already = (await c.query('SELECT 1 FROM settings WHERE id = 1')).rowCount;
    if (already) return { inserted: false };

    await c.query('INSERT INTO settings (id, data) VALUES (1, $1)', [data.settings]);
    for (const [i, city] of cities.entries()) {
      await c.query('INSERT INTO cities (id, name, region, sort_order) VALUES ($1, $2, $3, $4)', [city.id, city.name, city.region, i]);
    }
    for (const [i, e] of eventTypes.entries()) {
      await c.query('INSERT INTO event_types (id, name, icon, sort_order) VALUES ($1, $2, $3, $4)', [e.id, e.name, e.icon, i]);
    }
    for (const cat of data.categories) {
      const { id, slug, sortOrder, active, ...rest } = cat;
      await c.query('INSERT INTO categories (id, slug, sort_order, active, data) VALUES ($1, $2, $3, $4, $5)', [id, slug, sortOrder, active, rest]);
    }
    for (const p of data.providers) {
      const { id, status, commissionRate, ...rest } = p;
      await c.query('INSERT INTO providers (id, status, commission_rate, data) VALUES ($1, $2, $3, $4)', [id, status, commissionRate, rest]);
    }
    for (const s of data.services) {
      const { id, slug, categoryId, providerId, active, updatedAt: _u, ...rest } = s;
      void _u;
      await c.query('INSERT INTO services (id, slug, category_id, provider_id, active, data) VALUES ($1, $2, $3, $4, $5, $6)', [
        id,
        slug,
        categoryId,
        providerId,
        active,
        rest,
      ]);
    }

    if (opts.sampleData) {
      for (const cu of data.customers) {
        await c.query(
          `INSERT INTO customers (id, full_name, phone, email, city_id, tags, notes, blocked, source, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'import', $9)`,
          [cu.id, cu.fullName, cu.phone, cu.email, cu.cityId, cu.tags, cu.notes ?? null, cu.blocked, cu.createdAt],
        );
      }
      const customerByPhone = new Map(data.customers.map((cu) => [cu.phone, cu.id]));
      const services = new Map(data.services.map((s) => [s.id, s]));
      for (const b of data.bookings) {
        const pkg = services.get(b.selection.serviceId)!.packages.find((p) => p.id === b.selection.packageId)!;
        await c.query(
          `INSERT INTO bookings (id, reference, status, customer_id, service_id, event_date, start_time, duration_minutes, city_id, channel,
                                 origin, total, selection, event, customer, pricing, history, modification_request, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sample', $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            b.id,
            b.reference,
            b.status,
            customerByPhone.get(b.customer.phone),
            b.selection.serviceId,
            b.event.date,
            b.event.startTime,
            pkg.durationMinutes + b.event.extraHours * 60,
            b.event.cityId,
            b.channel ?? 'website',
            b.pricing.total,
            b.selection,
            b.event,
            b.customer,
            b.pricing,
            JSON.stringify(b.history),
            b.modificationRequest ?? null,
            b.createdAt,
            b.updatedAt,
          ],
        );
      }
      for (const p of data.promotions) {
        const { id, code, active, ...rest } = p;
        await c.query('INSERT INTO promotions (id, code, active, data) VALUES ($1, $2, $3, $4)', [id, code, active, rest]);
      }
      const hash = opts.sampleStaffPassword ? await hashPassword(opts.sampleStaffPassword) : null;
      for (const u of data.staff) {
        await c.query(
          `INSERT INTO staff_users (id, name, email, role, active, password_hash, must_change_password) VALUES ($1, $2, $3, $4, $5, $6, false)`,
          [u.id, u.name, u.email, u.role, u.active, hash],
        );
      }
      for (const a of [...data.audit].reverse()) {
        await c.query('INSERT INTO audit_log (at, actor_name, action, target) VALUES ($1, $2, $3, $4)', [a.at, a.by, a.action, a.target]);
      }
    }
    return { inserted: true };
  });
}
