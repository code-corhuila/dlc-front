import { createDouble } from '../../_double/double.js';

const double = createDouble('patient', 'Pacientes', 'dlc-patient-portal');

// Synthetic ids already defined by the Clinical demo build; no personal data here.
const SYNTHETIC = [
  ['patient-a', 'Paciente sintético A'],
  ['patient-b', 'Paciente sintético B'],
  ['patient-c', 'Paciente sintético C (sin asignación clínica)'],
  ['patient-d', 'Paciente sintético D (atención cerrada)'],
];

export const { portalId, contractVersion } = double;

/** Demo-only: opens the Clinical record through the C04 navigation capability. */
export async function mount(host, context) {
  const handle = await double.mount(host, context);
  const doc = host.ownerDocument;
  const list = doc.createElement('ul');
  list.className = 'dbl-patient-list';
  list.style.cssText = 'margin-top:16px;display:grid;gap:8px;padding:0';
  const render = (route) => {
    const term = (route.query.q?.[0] ?? '').toLowerCase();
    list.replaceChildren();
    const matches = SYNTHETIC.filter(([id, label]) =>
      `${id} ${label}`.toLowerCase().includes(term),
    );
    if (matches.length === 0) {
      const empty = doc.createElement('li');
      empty.style.listStyle = 'none';
      empty.textContent = `Sin resultados para "${term}" (doble de prueba).`;
      list.append(empty);
    }
    for (const [id, label] of matches) {
      const item = doc.createElement('li');
      item.style.listStyle = 'none';
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = `Abrir historia clínica — ${label}`;
      button.addEventListener('click', () =>
        context.navigation.request({ path: `/app/clinical/${id}` }),
      );
      item.append(button);
      list.append(item);
    }
  };
  render(context.route);
  host.append(list);
  return {
    ...handle,
    updateRoute: async (route) => {
      await handle.updateRoute(route);
      render(route);
    },
    unmount: async () => {
      list.remove();
      await handle.unmount();
    },
  };
}
