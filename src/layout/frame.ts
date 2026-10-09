import { icon } from './icons.ts';
import {
  activeItemId,
  visibleItems,
  type NavigationDescriptor,
} from './navigation.ts';

export type FrameUser = Readonly<{
  id: string;
  name: string;
  roles: readonly string[];
  permissions: readonly string[];
}>;

export type FrameOptions = Readonly<{
  user: FrameUser;
  navigation: readonly NavigationDescriptor[];
  path: string;
  onLogout: () => void;
}>;

export type Frame = Readonly<{ root: HTMLElement; host: HTMLElement }>;

const ROLE_BADGES: Readonly<Record<string, string>> = {
  ADMINISTRATOR: 'ADMIN',
  DENTIST: 'ODONTÓLOGO',
  SECRETARY_ASSISTANT: 'SECRETARÍA',
};

export const initials = (name: string, count: number) =>
  name
    .replace(/[^\p{L}]/gu, '')
    .slice(0, count)
    .toUpperCase();

/** Renders the common frame (mockup p. 4); the host stays empty for portals. */
export function renderFrame(document: Document, options: FrameOptions): Frame {
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const { user } = options;

  const nav = el('nav', 'dlc-nav');
  nav.setAttribute('aria-label', 'Principal');
  const active = activeItemId(options.navigation, options.path);
  for (const item of visibleItems(options.navigation, user)) {
    const link = el('a', 'dlc-nav-item');
    link.href = item.path;
    link.dataset.id = item.id;
    if (item.id === active) link.setAttribute('aria-current', 'page');
    link.append(icon(document, item.id), el('span', '', item.label));
    nav.append(link);
  }

  const logo = el('img', 'dlc-logo');
  logo.src = '/assets/logo.png';
  logo.alt = 'DI LUCCA Dental Care & Technology';

  const logout = el('button', 'dlc-logout');
  logout.type = 'button';
  logout.setAttribute('aria-label', 'Cerrar sesión');
  logout.append(icon(document, 'logout'));
  logout.addEventListener('click', () => options.onLogout());

  const role = user.roles.map((r) => ROLE_BADGES[r]).find(Boolean) ?? '';
  const who = el('div', 'dlc-sidebar-who');
  who.append(el('span', 'dlc-name', user.name), el('span', 'dlc-role', role));
  const footer = el('div', 'dlc-sidebar-user');
  footer.append(el('span', 'dlc-avatar', initials(user.name, 2)), who, logout);

  const sidebar = el('aside', 'dlc-sidebar');
  sidebar.append(logo, nav, footer);

  const search = el('input', 'dlc-search-input');
  search.type = 'search';
  search.placeholder = 'Buscar pacientes, citas...';
  search.setAttribute('aria-label', 'Buscar pacientes, citas');
  search.disabled = true; // Deferred by C04; shown as in the mockup.
  const searchBox = el('label', 'dlc-search');
  searchBox.append(icon(document, 'search'), search);

  const chip = el('div', 'dlc-user-chip');
  chip.append(
    el('span', 'dlc-avatar', initials(user.name, 1)),
    el('span', 'dlc-chip-name', user.name),
    icon(document, 'chevron'),
  );
  const header = el('header', 'dlc-topbar');
  header.setAttribute('role', 'banner');
  header.append(searchBox, chip);

  const host = el('section', 'dlc-host');
  host.id = 'composition-host';
  const main = el('main', 'dlc-main');
  main.id = 'content';
  main.append(host);

  const column = el('div', 'dlc-column');
  column.append(header, main);
  const root = el('div', 'dlc-shell');
  root.append(sidebar, column);
  return { root, host };
}
