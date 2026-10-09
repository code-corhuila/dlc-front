import { renderFrame } from './layout/frame.ts';
import { BASELINE_NAVIGATION } from './layout/navigation.ts';

// Development placeholder until the C05 session port and Auth double land.
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Administrador DI-LUCCA',
  roles: ['ADMINISTRATOR'],
  permissions: [],
};

const frame = renderFrame(document, {
  user,
  navigation: BASELINE_NAVIGATION,
  path: location.pathname,
  onLogout: () => undefined,
});
document.body.append(frame.root);
