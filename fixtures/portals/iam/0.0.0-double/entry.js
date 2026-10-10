import { createDouble } from '../../_double/double.js';

const double = createDouble(
  'iam',
  'IAM (Login, recuperación y gestión de usuarios)',
  'dlc-iam-portal',
);

const PERSONAS = [
  ['DENTIST', 'Odontóloga'],
  ['ADMINISTRATOR', 'Administración'],
  ['SECRETARY_ASSISTANT', 'Secretaría'],
];

export const { portalId, contractVersion } = double;

/** Development sign-in through the C05 iamSession capability (preview only). */
export async function mount(host, context) {
  const handle = await double.mount(host, context);
  if (!context.iamSession || context.route.basePath !== '/login') return handle;
  const doc = host.ownerDocument;
  const panel = doc.createElement('section');
  panel.className = 'dbl-iam-dev';
  panel.style.cssText = 'margin-top:16px;display:flex;gap:12px;flex-wrap:wrap';
  const title = doc.createElement('h2');
  title.textContent = 'Inicio de sesión de desarrollo (solo develop)';
  title.style.cssText = 'width:100%;font-size:16px;margin:0';
  panel.append(title);
  for (const [persona, label] of PERSONAS) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = `Entrar como ${label}`;
    button.addEventListener('click', () =>
      context.iamSession.complete({
        operationId: 'AuthVerifyMFAchallenge',
        body: { persona },
      }),
    );
    panel.append(button);
  }
  host.append(panel);
  return {
    ...handle,
    unmount: async () => {
      panel.remove();
      await handle.unmount();
    },
  };
}
