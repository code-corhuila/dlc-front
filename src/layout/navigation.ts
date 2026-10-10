export type Visibility = Readonly<{
  rolesAny: readonly string[];
  permissionsAll: readonly string[];
}>;

export type NavigationDescriptor = Readonly<{
  id: string;
  label: string;
  path: string;
  visibility: Visibility;
}>;

export type NavigationUser = Readonly<{
  roles: readonly string[];
  permissions: readonly string[];
}>;

const anyStaff: Visibility = { rolesAny: [], permissionsAll: [] };

// C04 baseline descriptors; owners will supply them through the registry (C01).
export const BASELINE_NAVIGATION: readonly NavigationDescriptor[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/app/dashboard',
    visibility: anyStaff,
  },
  {
    id: 'patients',
    label: 'Pacientes',
    path: '/app/patients',
    visibility: anyStaff,
  },
  {
    id: 'appointments',
    label: 'Citas',
    path: '/app/appointments/calendar',
    visibility: anyStaff,
  },
  {
    id: 'clinical',
    label: 'Clínica',
    path: '/app/clinical',
    visibility: { rolesAny: ['DENTIST', 'ADMINISTRATOR'], permissionsAll: [] },
  },
  {
    id: 'billing',
    label: 'Facturación',
    path: '/app/billing',
    visibility: anyStaff,
  },
  {
    id: 'administration',
    label: 'Administración',
    path: '/app/administration',
    visibility: { rolesAny: ['ADMINISTRATOR'], permissionsAll: [] },
  },
];

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Generic membership check against the Auth projection; missing claims fail closed. */
export function visibleItems(
  items: readonly NavigationDescriptor[],
  user: unknown,
): NavigationDescriptor[] {
  if (typeof user !== 'object' || user === null) return [];
  const { roles, permissions = [] } = user as Record<string, unknown>;
  if (!isStringArray(roles) || !isStringArray(permissions)) return [];
  return items.filter(
    ({ visibility: { rolesAny, permissionsAll } }) =>
      (rolesAny.length === 0 ||
        rolesAny.some((role) => roles.includes(role))) &&
      permissionsAll.every((permission) => permissions.includes(permission)),
  );
}

const segments = (path: string) => path.split('/').filter(Boolean);

/** Owner base of each item: its default path may point below the base. */
const ownerBase = (item: NavigationDescriptor) =>
  segments(item.path).slice(0, 2);

export function activeItemId(
  items: readonly NavigationDescriptor[],
  pathname: string,
): string | null {
  const current = segments(pathname);
  const match = items.find((item) =>
    ownerBase(item).every((segment, index) => current[index] === segment),
  );
  return match ? match.id : null;
}

const ORDER = BASELINE_NAVIGATION.map((item) => item.id);

/** Owner-supplied descriptors in the C04 baseline sidebar order; others follow. */
export function orderNavigation(
  items: readonly NavigationDescriptor[],
): NavigationDescriptor[] {
  const rank = (item: NavigationDescriptor) => {
    const position = ORDER.indexOf(item.id);
    return position === -1 ? ORDER.length : position;
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}
