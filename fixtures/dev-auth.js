// Development Auth double for local preview only (C05 AuthPort); never copied to dist/.
// It replaces Auth until IAM/Auth exist and never handles tokens or real credentials.
// Personas reuse the synthetic staff of the Clinical demo so its data scopes match.
export const PERSONAS = {
  DENTIST: { id: 'demo-dentist', name: 'Dra. Valentina Ruiz' },
  ADMINISTRATOR: { id: 'demo-admin', name: 'Laura Gómez' },
  SECRETARY_ASSISTANT: { id: 'demo-assistant', name: 'Camila Rojas' },
};

// Public, preview-only credentials. This double never validates real staff accounts.
const DEMO_PASSWORD = 'Demo1234!';
const DEMO_ACCOUNTS = [
  { email: 'admin@demo.test', role: 'ADMINISTRATOR' },
  { email: 'odontologo@demo.test', role: 'DENTIST' },
  { email: 'asistente@demo.test', role: 'SECRETARY_ASSISTANT' },
];

const DEMO_STAFF = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'admin@demo.test',
    name: 'Laura Gómez',
    roles: ['ADMINISTRATOR'],
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    email: 'odontologo@demo.test',
    name: 'Dra. Valentina Ruiz',
    roles: ['DENTIST'],
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    email: 'asistente@demo.test',
    name: 'Camila Rojas',
    roles: ['SECRETARY_ASSISTANT'],
    status: 'ACTIVE',
    version: 1,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    email: 'mateo@demo.test',
    name: 'Mateo Prueba',
    roles: ['DENTIST'],
    status: 'LOCKED',
    version: 2,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    email: 'sara@demo.test',
    name: 'Sara Demo',
    roles: ['SECRETARY_ASSISTANT'],
    status: 'DISABLED',
    version: 3,
  },
];

const demoError = (status, error) =>
  Response.json(
    { error, message: 'Operación no disponible en esta demostración.' },
    { status },
  );
const demoPage = (items, target) => {
  const page = Number(target.searchParams.get('page') || 1);
  const limit = Number(target.searchParams.get('limit') || 20);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  return {
    data: items.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    meta: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      totalPages: Math.ceil(items.length / safeLimit),
    },
  };
};

export function createAuthPort() {
  const establish = (role) => {
    const persona = PERSONAS[role];
    if (!persona) throw new Error('UNKNOWN_PERSONA');
    return {
      user: { ...persona, roles: [role] },
      permissions: [],
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    };
  };
  let signedOut = false;
  let activeRole = null;
  return {
    // Nothing is stored in the browser (C05). An optional deployment file
    // /dev-session.json ({"persona": "DENTIST"}) starts the preview signed in.
    restore: async () => {
      if (signedOut) return null;
      const response = await fetch('/dev-session.json', {
        cache: 'no-store',
      }).catch(() => null);
      if (!response?.ok) return null;
      const { persona } = await response.json();
      if (!PERSONAS[persona]) return null;
      activeRole = persona;
      return establish(persona);
    },
    // Opaque synthetic value accepted by the demo mock Gateway (presence check only).
    accessToken: () => (signedOut ? null : 'dev-synthetic-access'),
    complete: async ({ operationId, body }) => {
      let role;
      if (operationId === 'AuthLogin') {
        const email =
          typeof body?.email === 'string'
            ? body.email.trim().toLowerCase()
            : '';
        const account = DEMO_ACCOUNTS.find(
          (candidate) => candidate.email === email,
        );
        if (!account || body?.password !== DEMO_PASSWORD)
          throw new Error('INVALID_DEMO_CREDENTIALS');
        role = account.role;
      } else {
        throw new Error('UNSUPPORTED_DEMO_OPERATION');
      }
      const result = establish(role);
      signedOut = false;
      activeRole = role;
      return result;
    },
    logout: async () => {
      signedOut = true; // Stay signed out until the next page load.
      activeRole = null;
    },
    // Preview-only IAM reads. Other portals retain the normal fetch path.
    demoFetch: async (url, init) => {
      const target = new URL(url, 'http://localhost');
      const path = target.pathname;
      if (!path.startsWith('/api/v1/auth/')) return fetch(url, init);
      if (!activeRole) return demoError(401, 'UNAUTHORIZED');
      if (path.startsWith('/api/v1/auth/staff')) {
        if (activeRole !== 'ADMINISTRATOR') return demoError(403, 'FORBIDDEN');
        if (init.method !== 'GET') return demoError(503, 'SERVICE_UNAVAILABLE');
        if (path === '/api/v1/auth/staff')
          return Response.json(demoPage(DEMO_STAFF, target));
        const member = DEMO_STAFF.find(
          (item) => path === `/api/v1/auth/staff/${item.id}`,
        );
        return member ? Response.json(member) : demoError(404, 'NOT_FOUND');
      }
      if (path === '/api/v1/auth/sessions' && init.method === 'GET') {
        const now = Date.now();
        const sessions = [
          {
            id: '20000000-0000-4000-8000-000000000001',
            current: true,
            version: 1,
            device: 'Este navegador (demo)',
            expiresAt: new Date(now + 7 * 86400000).toISOString(),
            lastUserActivityAt: new Date(now).toISOString(),
          },
          {
            id: '20000000-0000-4000-8000-000000000002',
            current: false,
            version: 1,
            device: 'Otro dispositivo (demo)',
            expiresAt: new Date(now + 5 * 86400000).toISOString(),
            lastUserActivityAt: new Date(now - 86400000).toISOString(),
          },
        ];
        return Response.json(demoPage(sessions, target));
      }
      return demoError(503, 'SERVICE_UNAVAILABLE');
    },
  };
}
