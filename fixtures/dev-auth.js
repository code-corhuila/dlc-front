// Development Auth double for local preview only (C05 AuthPort); never copied to dist/.
// It replaces Auth until IAM/Auth exist and never handles tokens or real credentials.
// Personas reuse the synthetic staff of the Clinical demo so its data scopes match.
export const PERSONAS = {
  DENTIST: { id: 'demo-dentist', name: 'Dra. Valentina Ruiz' },
  ADMINISTRATOR: { id: 'demo-admin', name: 'Laura Gómez' },
  SECRETARY_ASSISTANT: { id: 'demo-assistant', name: 'Camila Rojas' },
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
      return PERSONAS[persona] ? establish(persona) : null;
    },
    complete: async ({ body }) => establish(body?.persona),
    logout: async () => {
      signedOut = true; // Stay signed out until the next page load.
    },
  };
}
