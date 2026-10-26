const CHANT_PANELS = [
  { role: 'sanskrit', field: 'source.shloka', language: 'sa', max: 88, min: 12 },
  { role: 'primary', field: null, language: null, max: 88, min: 12 },
  { role: 'secondary', field: null, language: null, max: 88, min: 11 }
];

const TYPICAL_LINES = Object.freeze({
  sa: 'धर्मक्षेत्रे कुरुक्षेत्रे',
  kn: 'ಧರ್ಮಕ್ಷೇತ್ರೇ ಕುರುಕ್ಷೇತ್ರೇ',
  en: 'dharma-kṣetre kuru-kṣetre'
});

const VEDIC_MARKS = /[\u030d\u030e\u0331\u0951\u0952\u1cda]/u;
const READABLE_FLOOR_CAP_RATIO = 0.6;
const WRAPPED_SIZE_IMPROVEMENT_RATIO = 1.25;

function chantFieldValue(row, field) {
  return field.split('.').reduce((value, part) => value && value[part], row) || '';
}

export function createVerseChantRenderer() {
  let root;
  let editing = false;
  let resizeObserver = null;
  let fitFrame = 0;
  const handleViewportChange = () => scheduleFit();

  function scheduleFit() {
    if (editing || !root) return;
    if (fitFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      fitText();
      requestAnimationFrame(fitText);
    });
  }

  function mount(container) {
    root = container;
    globalThis.document?.documentElement.classList.add('verse-chant-active');
    root.classList.add('verse-chant-root');
    root.innerHTML = '<div class="verse-chant-panels">' + CHANT_PANELS.map((panel) =>
      '<article class="verse-chant-panel verse-chant-panel-' + panel.role + '" data-panel="' + panel.role + '">' +
        '<div class="verse-chant-text" data-role="' + panel.role + '"></div>' +
      '</article>'
    ).join('') + '</div>';
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(scheduleFit);
      resizeObserver.observe(root);
      root.querySelectorAll('.verse-chant-panel').forEach((panel) => resizeObserver.observe(panel));
    }
    globalThis.addEventListener?.('resize', handleViewportChange);
    globalThis.document?.fonts?.ready.then(scheduleFit);
  }

  function panelFields(contentLanguage) {
    const primary = contentLanguage === 'kn' ? 'kn' : 'en';
    const secondary = primary === 'kn' ? 'en' : 'kn';
    return [
      { ...CHANT_PANELS[0] },
      { ...CHANT_PANELS[1], field: `languages.${primary}.transliteration`, language: primary },
      { ...CHANT_PANELS[2], field: `languages.${secondary}.transliteration`, language: secondary }
    ];
  }

  function makeEditable(element) {
    element.contentEditable = 'true';
    element.spellcheck = false;
    element.dataset.editField = element.dataset.field;
    element.classList.remove('empty');
    if (element.textContent === '—') element.textContent = '';
  }

  function render(row, contentLanguage) {
    const fields = panelFields(contentLanguage);
    const values = fields.map((panel) => chantFieldValue(row, panel.field));
    const sanskritLines = sourceLines(values[0]);
    const halfVerseLine = sanskritLines.findIndex((line) => /\u0964\s*$/u.test(line) && !/\u0965\s*$/u.test(line));
    root.dataset.primaryLanguage = fields[1].language;
    fields.forEach((panel, index) => {
      const element = root.querySelector('[data-role="' + panel.role + '"]');
      const text = values[index];
      const lines = sourceLines(text);
      element.dataset.field = panel.field;
      element.lang = panel.language;
      element.dataset.wrapped = 'false';
      element.classList.toggle('has-vedic-marks', VEDIC_MARKS.test(text));
      element.replaceChildren(...lines.map((line, lineIndex) => {
        const lineElement = globalThis.document?.createElement?.('span') || {
          dataset: {}, classList: { add() {} }, textContent: ''
        };
        lineElement.className = 'verse-chant-line';
        lineElement.dataset.sourceLine = String(lineIndex);
        if (halfVerseLine === lineIndex && (index === 0 || lines.length === sanskritLines.length)) {
          lineElement.classList.add('verse-chant-half-verse-end');
        }
        lineElement.textContent = line;
        return lineElement;
      }));
      element.classList.toggle('empty', !text);
      if (editing) makeEditable(element);
    });
    scheduleFit();
  }

  function sourceLines(text) {
    return String(text || '—').replace(/\r\n?/g, '\n').replace(/\n+$/g, '').split('\n');
  }

  function numericStyle(style, property, fallback) {
    const value = Number.parseFloat(style.getPropertyValue(property));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function typicalVerseCap(text, availableWidth, availableHeight, maxSize) {
    const style = getComputedStyle(text);
    const scale = numericStyle(style, '--verse-chant-script-scale', 1);
    const lineHeight = numericStyle(style, '--verse-chant-line-height', 1.5);
    const language = text.lang === 'kn' ? 'kn' : text.lang === 'sa' ? 'sa' : 'en';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let widthCap = maxSize;
    if (context) {
      context.font = `1px ${style.fontFamily}`;
      const unitWidth = context.measureText(TYPICAL_LINES[language]).width * scale;
      if (unitWidth > 0) widthCap = availableWidth / unitWidth;
    }
    const heightCap = availableHeight / ((4 * lineHeight + 0.35) * scale);
    return Math.max(1, Math.min(maxSize, widthCap, heightCap));
  }

  function setFitSize(text, size) {
    text.style.setProperty('--verse-chant-fit-size', size + 'px');
  }

  function fits(text, availableWidth, availableHeight) {
    return text.scrollWidth <= availableWidth + 1 && text.scrollHeight <= availableHeight + 1;
  }

  function searchFit(text, availableWidth, availableHeight, low, high) {
    let best = 0;
    while (low <= high) {
      const size = Math.floor((low + high) / 2);
      setFitSize(text, size);
      if (fits(text, availableWidth, availableHeight)) {
        best = size;
        low = size + 1;
      } else high = size - 1;
    }
    return best;
  }

  function fitElement(panel, text, maxSize, minSize) {
    if (!panel || !text || !panel.clientHeight || !panel.clientWidth) return;
    const style = getComputedStyle(panel);
    const availableHeight = panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const availableWidth = panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    if (availableHeight <= 0 || availableWidth <= 0) return;
    text.dataset.wrapped = 'false';
    const cap = Math.floor(typicalVerseCap(text, availableWidth, availableHeight, maxSize));
    text.dataset.fitCap = String(cap);
    const noWrapBest = searchFit(text, availableWidth, availableHeight, minSize, Math.max(minSize, cap));
    text.dataset.noWrapFitSize = String(noWrapBest);

    text.dataset.wrapped = 'true';
    const wrappedBest = searchFit(text, availableWidth, availableHeight, minSize, Math.max(minSize, cap));
    text.dataset.wrappedFitSize = String(wrappedBest);
    const readableFloor = Math.max(minSize, READABLE_FLOOR_CAP_RATIO * cap);
    const shouldWrap = !noWrapBest || (
      noWrapBest < readableFloor &&
      wrappedBest >= noWrapBest * WRAPPED_SIZE_IMPROVEMENT_RATIO
    );

    if (!shouldWrap && noWrapBest) {
      text.dataset.wrapped = 'false';
      setFitSize(text, noWrapBest);
      return;
    }
    setFitSize(text, wrappedBest || minSize);
  }

  function fitText() {
    if (editing || !root) return;
    panelFields(root.dataset.primaryLanguage).forEach((panel) => fitElement(
      root.querySelector('[data-panel="' + panel.role + '"]'),
      root.querySelector('[data-role="' + panel.role + '"]'),
      panel.max,
      panel.min
    ));
  }

  function setEditing(enabled) {
    editing = enabled;
    root.querySelectorAll('[data-role]').forEach((element) => {
      if (enabled) makeEditable(element);
      else {
        element.contentEditable = 'false';
        delete element.dataset.editField;
      }
    });
    if (!enabled) scheduleFit();
  }

  return {
    id: 'verse-chant',
    mount,
    render,
    setEditing,
    editableElements: () => Array.from(root.querySelectorAll('[data-edit-field]')),
    fitText,
    destroy() {
      if (fitFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(fitFrame);
      resizeObserver?.disconnect();
      resizeObserver = null;
      globalThis.removeEventListener?.('resize', handleViewportChange);
      globalThis.document?.documentElement.classList.remove('verse-chant-active');
      if (root) {
        root.classList.remove('verse-chant-root');
        root.textContent = '';
      }
      root = null;
    }
  };
}
