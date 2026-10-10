import type { Frame } from './frame.ts';

/**
 * Public brand frame (mockup pp. 1-3) around IAM-owned Login/Recovery. Home and the
 * legal pages are deferred (navigation-map.md), so their links render inactive.
 */
export function renderPublicFrame(document: Document): Frame {
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
  const inactive = (text: string) => {
    const item = el('span', 'dlc-public-link', text);
    item.setAttribute('aria-disabled', 'true');
    return item;
  };
  const brand = (className: string) => {
    const node = el('span', className);
    node.append(el('span', 'dlc-brand-di', 'DI'), ' ', el('span', '', 'LUCCA'));
    return node;
  };

  const mark = el('img', 'dlc-public-mark');
  mark.src = '/assets/emblem.png';
  mark.alt = '';
  const home = el('span', 'dlc-public-brand');
  home.append(mark, brand('dlc-brand-word'));
  const nav = el('nav', 'dlc-public-nav');
  nav.setAttribute('aria-label', 'Sitio');
  nav.append(inactive('Citas'), inactive('Servicios'), inactive('Contacto'));
  const login = el('a', 'dlc-public-login', 'Login');
  login.href = '/login';
  const header = el('header', 'dlc-public-header');
  header.setAttribute('role', 'banner');
  header.append(home, nav, login);

  const host = el('section', 'dlc-public-host');
  host.id = 'public-host';
  const main = el('main', 'dlc-public-main');
  main.tabIndex = -1;
  main.append(host);

  const legal = el('nav', 'dlc-public-legal');
  legal.setAttribute('aria-label', 'Legal');
  legal.append(
    inactive('Privacidad'),
    inactive('Términos'),
    inactive('Cookies'),
  );
  const copyright = el('p', 'dlc-public-copy');
  copyright.append(
    brand('dlc-brand-word'),
    el('span', '', '© 2026 DI LUCCA. Todos los derechos reservados.'),
  );
  const footer = el('footer', 'dlc-public-footer');
  footer.setAttribute('role', 'contentinfo');
  footer.append(copyright, legal);

  const root = el('div', 'dlc-public');
  root.append(header, main, footer);
  return { root, host, main, setActive: () => undefined };
}
