import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductWorkspace, parseProductTable, productLabel, safeProductPath } from '../../js/products.js';

test('product registry keeps stable IDs separate from folder paths and localizes labels', () => {
  const registry = parseProductTable('product_id#path#enabled#order\nbhagavad-gita#gita#true#1\nsukta#sukta#true#2\n');
  const workspace = normalizeProductWorkspace({
    app: { defaultProduct: 'bhagavad-gita' },
    registry,
    localized: {
      en: parseProductTable('product_id#name#short_name#description\nbhagavad-gita#Bhagavad Gita#Gita#Gita verses\nsukta#Suktas#Sukta#Vedic hymns'),
      kn: parseProductTable('product_id#name#short_name#description\nbhagavad-gita#ಭಗವದ್ಗೀತೆ#ಗೀತೆ#ಗೀತಾ ಶ್ಲೋಕಗಳು\nsukta#ಸೂಕ್ತಗಳು#ಸೂಕ್ತ#ವೇದ ಸೂಕ್ತಗಳು')
    },
    products: [{ id: 'bhagavad-gita', config: {} }, { id: 'sukta', config: {} }]
  });
  assert.equal(workspace.products[0].id, 'bhagavad-gita');
  assert.equal(workspace.products[0].path, 'gita');
  assert.equal(productLabel(workspace.products[1], 'kn').name, 'ಸೂಕ್ತಗಳು');
});

test('product paths cannot escape the products root', () => {
  assert.equal(safeProductPath('purusha-sukta'), 'purusha-sukta');
  assert.throws(() => safeProductPath('../outside'), /Invalid product path/);
});
