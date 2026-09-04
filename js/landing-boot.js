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
      const a = el.querySelector('.faq-answer');
      if (a) a.style.maxHeight = null;
    });
    if (!isOpen && answer) { item.classList.add('open'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
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
    if (sourceTerms.length === 0 || targetTerms.length === 0) return false;

    const sourceText = row.querySelector('.convert-source')?.textContent || '';
    // A <from>-to-<to> href also names the SOURCE format, so matching target
    // terms against the whole href makes "png to png" match the PNG row. Task
    // routes (/create-zip, /pdf-ocr) carry no "-to-" and are used whole.
    const targetText = Array.from(row.querySelectorAll('.tool-link'))
      .map(link => {
        const href = link.getAttribute('href') || '';
        const sep = href.lastIndexOf('-to-');
        return `${link.textContent || ''} ${sep === -1 ? href : href.slice(sep + 4)}`;
      })
      .join(' ');
    return textMatchesTerms(sourceText, sourceTerms)
      && textMatchesTerms(targetText, targetTerms);
  }

  const terms = searchTerms(query);
  if (terms.length === 0) return false;
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
