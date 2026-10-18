import type { Queryable } from '../db/pool';
import type { StaffPrincipal } from './auth';

/** Every staff change is recorded with who did it (docs/05-admin-dashboard.md). */
export async function audit(db: Queryable, actor: Pick<StaffPrincipal, 'id' | 'name'> | null, action: string, target: string, detail?: string) {
  await db.query('INSERT INTO audit_log (actor_id, actor_name, action, target, detail) VALUES ($1, $2, $3, $4, $5)', [
    actor?.id ?? null,
    actor?.name ?? 'system',
    action,
    target.slice(0, 200),
    detail ? detail.slice(0, 500) : null,
  ]);
}
