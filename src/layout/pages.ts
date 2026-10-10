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

type Action = Readonly<{ label: string; href?: string; onClick?: () => void }>;

/** One card for every full-page state: heading, message and at most one action. */
function statePage(
  document: Document,
  title: string,
  message: string,
  action?: Action,
): HTMLElement {
  const el = make(document);
  const page = el('section', 'dlc-state');
  page.append(heading(document, title), el('p', 'dlc-page-subtitle', message));
  if (action?.href) {
    const link = el('a', 'dlc-button', action.label);
    link.href = action.href;
    page.append(link);
  } else if (action?.onClick) {
    const button = el('button', 'dlc-button', action.label);
    button.type = 'button';
    button.addEventListener('click', action.onClick);
    page.append(button);
  }
  return page;
}

export function renderNotFound(document: Document): HTMLElement {
  return statePage(
    document,
    'Página no encontrada',
    'La dirección solicitada no existe en DI LUCCA.',
    { label: 'Ir al Dashboard', href: '/app/dashboard' },
  );
}

export type ServiceError =
  | 'SESSION_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'REGISTRY_UNAVAILABLE'
  | 'UNSUPPORTED_BROWSER';

/** C05/C07/FC-18 shell states when a service or the browser cannot support the app. */
export function renderServiceError(
  document: Document,
  error: ServiceError,
  onRetry?: () => void,
): HTMLElement {
  const retry = onRetry ? { label: 'Reintentar', onClick: onRetry } : undefined;
  const page = {
    SESSION_UNAVAILABLE: () =>
      statePage(
        document,
        'Servicio de autenticación no disponible',
        'No pudimos verificar tu sesión. Inténtalo de nuevo en unos minutos.',
        retry,
      ),
    SESSION_EXPIRED: () =>
      statePage(
        document,
        'Tu sesión expiró',
        'Por seguridad, vuelve a iniciar sesión para continuar.',
        { label: 'Iniciar sesión', href: '/login' },
      ),
    REGISTRY_UNAVAILABLE: () =>
      statePage(
        document,
        'Servicios no disponibles',
        'No pudimos cargar las secciones de DI LUCCA. Inténtalo de nuevo en unos minutos.',
        retry,
      ),
    UNSUPPORTED_BROWSER: () =>
      statePage(
        document,
        'Navegador no compatible',
        'Usa una versión reciente de Chrome, Edge, Firefox o Safari para ingresar a DI LUCCA.',
      ),
  }[error]();
  page.dataset.code = error;
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

/**
 * Public Home (mockup p. 1). The hero artwork already contains its text, so the same
 * content is provided as visually hidden text for assistive technology.
 */
export function renderHome(document: Document): HTMLElement {
  const el = make(document);
  const home = el('section', 'dlc-home');
  const text = el('div', 'dlc-visually-hidden');
  const pillars = el('ul');
  for (const pillar of [
    'Seguridad y confianza',
    'Tecnología avanzada',
    'Cuidado personalizado',
    'Sonrisas que transforman',
  ])
    pillars.append(el('li', '', pillar));
  text.append(
    heading(document, '¡Bienvenido!'),
    el('p', '', 'Tu sonrisa, nuestra prioridad.'),
    el(
      'p',
      '',
      'En DI LUCCA combinamos tecnología, experiencia y un trato humano para cuidar de ti y tu salud bucal.',
    ),
    pillars,
  );
  home.append(text);
  return home;
}

/** C07: the probed entry answers again; the user still decides when to reload it. */
export function markAvailable(notice: HTMLElement, onReload: () => void): void {
  notice.dataset.code = 'PORTAL_AVAILABLE';
  notice.setAttribute('role', 'status');
  notice.classList.remove('dlc-state-error');
  const title = notice.querySelector('h2');
  const text = notice.querySelector('p');
  const button = notice.querySelector('button');
  if (title) title.textContent = 'La sección ya está disponible';
  if (text) text.textContent = 'El servicio respondió de nuevo.';
  // A failed module import stays cached by the browser: recover with a page reload (C07).
  const reload = notice.ownerDocument.createElement('button');
  reload.type = 'button';
  reload.className = 'dlc-button';
  reload.textContent = 'Actualizar';
  reload.addEventListener('click', onReload);
  button?.replaceWith(reload);
}

/** Shown when the published registry revision changes (new portal releases). */
export function renderUpdateBanner(
  document: Document,
  onReload: () => void,
): HTMLElement {
  const el = make(document);
  const banner = el('div', 'dlc-update-banner');
  banner.setAttribute('role', 'status');
  const reload = el('button', 'dlc-button', 'Actualizar');
  reload.type = 'button';
  reload.addEventListener('click', onReload);
  banner.append(
    el('span', '', 'Hay una nueva versión de DI LUCCA disponible.'),
    reload,
  );
  return banner;
}
