import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const faces = [
  { family: 'Gitaverse Noto Sans Latin', file: 'NotoSans.ttf', range: 'U+0000-024F, U+0300-036F, U+1E00-1EFF, U+2000-206F, U+20A0-20CF' },
  { family: 'Gitaverse Noto Sans Devanagari', file: 'NotoSansDevanagari.ttf', range: 'U+0900-097F, U+1CD0-1CFF, U+A8E0-A8FF, U+11B00-11B5F' },
  // Android cannot reliably shape a Kannada base glyph with Vedic combining
  // marks selected from another face. Keep the marks available in
  // NotoSansKannada on the same face as the Kannada letters.
  { family: 'Gitaverse Noto Sans Kannada', file: 'NotoSansKannada.ttf', range: 'U+0C80-0CFF, U+0951-0952, U+1CDA' }
];

const blocks = [];
for (const face of faces) {
  const bytes = await readFile(path.join(root, 'assets/fonts', face.file));
  blocks.push(`@font-face {
  font-family: "${face.family}";
  src: url("data:font/ttf;base64,${bytes.toString('base64')}") format("truetype");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  unicode-range: ${face.range};
}`);
}

const css = `${blocks.join('\n\n')}

:root {
  --font-sans-latin: "Gitaverse Noto Sans Latin", "Gitaverse Noto Sans Devanagari", "Gitaverse Noto Sans Kannada";
  --font-sans-devanagari: "Gitaverse Noto Sans Devanagari", "Gitaverse Noto Sans Latin", "Gitaverse Noto Sans Kannada";
  --font-sans-kannada: "Gitaverse Noto Sans Kannada", "Gitaverse Noto Sans Devanagari", "Gitaverse Noto Sans Latin";
  --font-sans: var(--font-sans-latin);
}

:lang(en) {
  --font-sans: var(--font-sans-latin);
  font-family: var(--font-sans-latin);
}

:lang(sa) {
  --font-sans: var(--font-sans-devanagari);
  font-family: var(--font-sans-devanagari);
}

:lang(kn) {
  --font-sans: var(--font-sans-kannada);
  font-family: var(--font-sans-kannada);
}
`;

await writeFile(path.join(root, 'css/fonts.css'), css);
