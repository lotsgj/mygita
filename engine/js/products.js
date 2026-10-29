export function parseProductTable(text) {
  const rows = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!rows.length) return [];
  const headers = rows.shift().split('#').map((value) => value.trim());
  return rows.map((line) => Object.fromEntries(line.split('#').map((value, index) => [headers[index], value.trim()])));
}

export function safeProductPath(value) {
  const path = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(path)) throw new Error(`Invalid product path: ${path || '(empty)'}.`);
  return path;
}

export function normalizeProductWorkspace({ app = {}, registry = [], localized = {}, products = [] } = {}) {
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const normalizedRegistry = registry
    .filter((row) => String(row.enabled).toLowerCase() !== 'false')
    .map((row, index) => {
      const id = String(row.product_id || '').trim();
      if (!id) throw new Error('Every product registry row requires product_id.');
      const path = safeProductPath(row.path);
      const metadata = Object.fromEntries(Object.entries(localized).map(([language, rows]) => {
        const match = rows.find((entry) => entry.product_id === id) || {};
        return [language, {
          name: match.name || id,
          shortName: match.short_name || match.name || id,
          description: match.description || ''
        }];
      }));
      return {
        id,
        path,
        order: Number(row.order) || index + 1,
        metadata,
        ...(byId.get(id) || {})
      };
    })
    .sort((left, right) => left.order - right.order);
  if (!normalizedRegistry.length) throw new Error('The products folder does not contain any enabled products.');
  const defaultProduct = normalizedRegistry.some((product) => product.id === app.defaultProduct)
    ? app.defaultProduct
    : normalizedRegistry[0].id;
  return { app: { ...app, defaultProduct }, products: normalizedRegistry };
}

export function productLabel(product, language = 'en') {
  return product?.metadata?.[language] || product?.metadata?.en || {
    name: product?.id || '', shortName: product?.id || '', description: ''
  };
}
