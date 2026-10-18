import type { Permission, RoleId } from '../models';

/**
 * Role → permission matrix. Every role can view every page; permissions control
 * who can change things. Project 2 must enforce the same matrix on the server:
 * hiding a button in the browser is not security.
 */
export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  admin: [
    'bookings.manage',
    'catalog.manage',
    'providers.manage',
    'customers.manage',
    'pricing.manage',
    'promotions.manage',
    'reports.view',
    'staff.manage',
  ],
  operations: ['bookings.manage', 'catalog.manage', 'providers.manage', 'customers.manage'],
  finance: ['pricing.manage', 'promotions.manage', 'reports.view'],
  viewer: [],
};

export const ROLES: RoleId[] = ['admin', 'operations', 'finance', 'viewer'];

export const can = (role: RoleId | undefined, permission: Permission) => !!role && ROLE_PERMISSIONS[role].includes(permission);
