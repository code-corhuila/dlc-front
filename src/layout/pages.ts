import { icon } from './icons.ts';
import {
  visibleItems,
  type NavigationDescriptor,
  type NavigationUser,
} from './navigation.ts';

function make(document: Document) {
  return <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
}

/** Screen heading that receives focus after navigation (C04). */
function heading(document: Document, text: string) {
  const h1 = make(document)('h1', 'dlc-page-title', text);
  h1.tabIndex = -1;
  return h1;
}

export function renderNotFound(document: Document): HTMLElement {
  const el = make(document);
  const page = el('section', 'dlc-state');
  const back = el('a', 'dlc-button', 'Ir al Dashboard');
  back.href = '/app/dashboard';
  page.append(
    heading(document, 'Página no encontrada'),
    el(
      'p',
      'dlc-page-subtitle',
      'La dirección solicitada no existe en DI LUCCA.',
    ),
    back,
  );
  return page;
}

/** C07: local notice; header, menu and other routes stay usable. */
export function renderUnavailable(
  document: Document,
  options: Readonly<{ onRetry: () => void }>,
): HTMLElement {
  const el = make(document);
  const notice = el('section', 'dlc-state dlc-state-error');
  notice.setAttribute('role', 'alert');
  notice.dataset.code = 'PORTAL_UNAVAILABLE';
  const retry = el('button', 'dlc-button', 'Reintentar');
  retry.type = 'button';
  retry.addEventListener('click', () => options.onRetry());
  notice.append(
    el('h2', 'dlc-state-title', 'Esta sección no está disponible'),
    el(
      'p',
      'dlc-page-subtitle',
      'Puedes reintentar o abrir otra sección del menú.',
    ),
    retry,
  );
  return notice;
}

export type DashboardOptions = Readonly<{
  userName: string;
  user: NavigationUser;
  navigation: readonly NavigationDescriptor[];
}>;

/** Shell-owned dashboard: shortcuts only; indicators belong to Clinical (HU-CLN-003). */
export function renderDashboard(document: Document, options: DashboardOptions) {
  const el = make(document);
  const root = el('section', 'dlc-dashboard');
  const shortcuts = el('nav', 'dlc-shortcuts');
  shortcuts.setAttribute('aria-label', 'Accesos directos');
  for (const item of visibleItems(options.navigation, options.user)) {
    if (item.path === '/app/dashboard') continue;
    const link = el('a', 'dlc-shortcut');
    link.href = item.path;
    link.append(icon(document, item.id), el('span', '', item.label));
    shortcuts.append(link);
  }
  const analyticsHost = el('section', 'dlc-analytics-host');
  analyticsHost.setAttribute('aria-label', 'Analítica clínica');
  root.append(
    heading(document, 'Panel'),
    el('p', 'dlc-page-subtitle', `Hola de nuevo, ${options.userName}.`),
    analyticsHost,
    shortcuts,
  );
  return { root, analyticsHost };
}
