const PANELS = [
  { role: 'shloka', panelClass: 'shloka', max: [42, 36], min: 10 },
  { role: 'meaning', panelClass: 'meaning', max: [31, 27], min: 10 },
  { role: 'transliteration', panelClass: 'transliteration', max: [30, 27], min: 10 },
  { role: 'word', panelClass: 'word', max: [22, 19], min: 9 }
];

export function createGita700Renderer() {
  let root;

  function fieldFor(role, language) {
    if (role === 'shloka') return 'source.shloka';
    if (role === 'word') return 'languages.' + language + '.wordByWordMeaning';
    return 'languages.' + language + '.' + role;
  }

  function fieldValue(row, field) {
    return field.split('.').reduce((value, part) => value && value[part], row) || '';
  }

  function mount(container) {
    root = container;
    root.innerHTML = '<div class="gita-700-panels">' + PANELS.map((panel) =>
      '<article class="gita-700-panel gita-700-panel-' + panel.panelClass + '">' +
        '<div class="gita-700-panel-content" data-panel="' + panel.role + '">' +
          '<div class="gita-700-text" data-role="' + panel.role + '"></div>' +
        '</div>' +
      '</article>'
    ).join('') + '</div>';
  }

  function render(row, language, panelLanguages = {}) {
    PANELS.forEach((panel) => {
      const panelLanguage = panelLanguages[panel.role] || (panel.role === 'shloka' ? 'sa' : language);
      const field = fieldFor(panel.role, panelLanguage);
      const element = root.querySelector('[data-role="' + panel.role + '"]');
      const text = fieldValue(row, field);
      element.dataset.field = field;
      element.lang = panelLanguage;
      element.textContent = text || '—';
      element.classList.toggle('empty', !text);
    });
    requestAnimationFrame(fitText);
  }

  function fitElement(panel, text, maxSize, minSize) {
    if (!panel || !text || !panel.clientHeight) return;
    let low = minSize;
    let high = maxSize;
    let best = minSize;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      text.style.fontSize = middle + 'px';
      if (text.scrollHeight <= panel.clientHeight - 4 && text.scrollWidth <= panel.clientWidth - 4) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    text.style.fontSize = best + 'px';
  }

  function fitText() {
    if (!root) return;
    const mobile = matchMedia('(max-width: 760px)').matches;
    PANELS.forEach((panel) => {
      fitElement(
        root.querySelector('[data-panel="' + panel.role + '"]'),
        root.querySelector('[data-role="' + panel.role + '"]'),
        panel.max[mobile ? 1 : 0],
        panel.min
      );
    });
  }

  return {
    id: 'gita-700',
    mount,
    render,
    fitText,
    destroy() { if (root) root.textContent = ''; root = null; }
  };
}
