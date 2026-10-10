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

export type Frame = Readonly<{
  root: HTMLElement;
  host: HTMLElement;
  main: HTMLElement;
  setActive: (path: string) => void;
  /** Re-renders role-filtered navigation and identity (C05 session change). */
  setUser?: (user: FrameUser) => void;
}>;

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
  let path = options.path;
  const nav = el('nav', 'dlc-nav');
  nav.setAttribute('aria-label', 'Principal');

  const logo = el('img', 'dlc-logo');
  logo.src = '/assets/logo.png';
  logo.alt = 'DI LUCCA Dental Care & Technology';

  const logout = el('button', 'dlc-logout');
  logout.type = 'button';
  logout.setAttribute('aria-label', 'Cerrar sesión');
  logout.append(icon(document, 'logout'));
  logout.addEventListener('click', () => options.onLogout());

  const name = el('span', 'dlc-name');
  const role = el('span', 'dlc-role');
  const who = el('div', 'dlc-sidebar-who');
  who.append(name, role);
  const avatar = el('span', 'dlc-avatar');
  const footer = el('div', 'dlc-sidebar-user');
  footer.append(avatar, who, logout);

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
  const chipAvatar = el('span', 'dlc-avatar');
  const chipName = el('span', 'dlc-chip-name');
  chip.append(chipAvatar, chipName, icon(document, 'chevron'));
  const header = el('header', 'dlc-topbar');
  header.setAttribute('role', 'banner');
  header.append(searchBox, chip);

  const host = el('section', 'dlc-host');
  host.id = 'composition-host';
  const main = el('main', 'dlc-main');
  main.id = 'content';
  main.tabIndex = -1; // Focus fallback when a portal has no focusable heading.
  main.append(host);

  const column = el('div', 'dlc-column');
  column.append(header, main);
  const root = el('div', 'dlc-shell');
  root.append(sidebar, column);
  let visible: NavigationDescriptor[] = [];
  const setActive = (next: string) => {
    path = next;
    const active = activeItemId(visible, path);
    for (const link of nav.querySelectorAll('a')) {
      if (link.dataset.id === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  };
  const setUser = (user: FrameUser) => {
    visible = visibleItems(options.navigation, user);
    nav.replaceChildren(
      ...visible.map((item) => {
        const link = el('a', 'dlc-nav-item');
        link.href = item.path;
        link.dataset.id = item.id;
        link.title = item.label; // Icon-only sidebar on narrow screens.
        link.setAttribute('aria-label', item.label);
        link.append(icon(document, item.id), el('span', '', item.label));
        return link;
      }),
    );
    name.textContent = chipName.textContent = user.name;
    role.textContent =
      user.roles.map((r) => ROLE_BADGES[r]).find(Boolean) ?? '';
    avatar.textContent = initials(user.name, 2);
    chipAvatar.textContent = initials(user.name, 1);
    setActive(path);
  };
  setUser(options.user);
  return { root, host, main, setActive, setUser };
}
