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
  for (const [id, label] of SYNTHETIC) {
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
  host.append(list);
  return {
    ...handle,
    unmount: async () => {
      list.remove();
      await handle.unmount();
    },
  };
}
