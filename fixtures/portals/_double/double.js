// C02 test-double portal for local preview only; never copied to dist/.
// It shows contract data, not the owner's functional screens.
export function createDouble(portalId, title, repository) {
  return {
    portalId,
    contractVersion: 1,
    async mount(host, context) {
      const doc = host.ownerDocument;
      const root = doc.createElement('section');
      root.className = `dbl-${portalId}`;
      root.style.cssText =
        'padding:24px;border:1px dashed #c2c6d4;border-radius:8px;background:#fff';
      const render = (route) => {
        root.replaceChildren();
        const h1 = doc.createElement('h1');
        h1.tabIndex = -1;
        h1.textContent = title;
        const note = doc.createElement('p');
        note.textContent = `Doble de prueba C02. El contenido real lo entrega ${repository}.`;
        const data = doc.createElement('pre');
        data.textContent = JSON.stringify(
          { portalId, basePath: route.basePath, localPath: route.localPath },
          null,
          2,
        );
        root.append(h1, note, data);
      };
      render(context.route);
      host.append(root);
      return {
        updateRoute: async (route) => render(route),
        canLeave: async () => true,
        unmount: async () => root.remove(),
      };
    },
  };
}
