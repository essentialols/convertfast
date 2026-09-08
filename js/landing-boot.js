import { applyPageUX } from './ux-page.js';
import { initSmartDrop } from './smart-drop.js';

initSmartDrop();

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-answer').style.maxHeight = null;
    });
    if (!isOpen) { item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
  });
});

applyPageUX({
  dropZoneSelector: '#smart-drop',
  fileInputSelector: '#smart-file-input',
  manualText: 'Mode: drop one file, then choose a conversion or tool below.',
  autoText: 'Mode: drop one file, then choose a conversion or tool below.',
});

const SEARCH_FILLER_WORDS = new Set([
  'convert', 'converter', 'converters', 'conversion', 'conversions',
  'file', 'files', 'to', 'into',
]);

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .replace(/\bjpeg\b/g, 'jpg')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchTerms(value) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter(term => term && !SEARCH_FILLER_WORDS.has(term));
}

function textMatchesTerms(text, terms) {
  const searchable = normalizeSearchText(text);
  return terms.every(term => searchable.includes(term));
}

function directionalSearchParts(query) {
  return query.match(/^(?:convert\s+)?(.+?)\s+(?:to|into)\s+(.+)$/i)
    || query.match(/^(?:convert\s+)?(.+?)\s*(?:→|->)\s*(.+)$/i);
}

function rowMatchesToolsQuery(row, query) {
  if (!query) return true;

  const directional = directionalSearchParts(query);
  if (directional) {
    const sourceTerms = searchTerms(directional[1]);
    const targetTerms = searchTerms(directional[2]);
    // "files to png" carries no usable source, so fall back to the plain
    // search rather than matching nothing.
    if (sourceTerms.length === 0 && targetTerms.length === 0) return true;

    const sourceText = row.querySelector('.convert-source')?.textContent || '';
    const targetText = Array.from(row.querySelectorAll('.tool-link'))
      .map(link => `${link.textContent || ''} ${link.getAttribute('href') || ''}`)
      .join(' ');
    return textMatchesTerms(sourceText, sourceTerms)
      && textMatchesTerms(targetText, targetTerms);
  }

  const terms = searchTerms(query);
  // A query that is only filler ("convert", "files") narrows nothing, so it
  // must not hide every tool.
  if (terms.length === 0) return true;
  const searchableText = `${row.textContent || ''} ${Array.from(row.querySelectorAll('a'))
    .map(link => link.getAttribute('href') || '')
    .join(' ')}`;
  return textMatchesTerms(searchableText, terms);
}

const toolsFilterInput = document.getElementById('tools-filter');
const toolsFilterSummary = document.getElementById('tools-filter-summary');
if (toolsFilterInput) {
  const rows = Array.from(document.querySelectorAll('.convert-row'));
  const groups = Array.from(document.querySelectorAll('.convert-group'));

  const updateToolsFilter = () => {
    const query = toolsFilterInput.value.trim();
    let visibleRows = 0;

    rows.forEach((row) => {
      const match = rowMatchesToolsQuery(row, query);
      row.style.display = match ? '' : 'none';
      if (match) visibleRows += 1;
    });

    groups.forEach((group) => {
      let next = group.nextElementSibling;
      let hasVisibleRow = false;
      while (next && !next.classList.contains('convert-group')) {
        if (next.classList.contains('convert-row') && next.style.display !== 'none') {
          hasVisibleRow = true;
          break;
        }
        next = next.nextElementSibling;
      }
      group.style.display = hasVisibleRow ? '' : 'none';
    });

    if (toolsFilterSummary) {
      if (!query) {
        toolsFilterSummary.textContent = `${rows.length} total conversions`;
      } else if (visibleRows === 0) {
        toolsFilterSummary.textContent = 'No matching conversions. Try a format like PNG or a task like compress.';
      } else {
        toolsFilterSummary.textContent = `${visibleRows} matching conversion${visibleRows === 1 ? '' : 's'}`;
      }
    }
  };

  toolsFilterInput.addEventListener('input', updateToolsFilter);
  updateToolsFilter();
}
