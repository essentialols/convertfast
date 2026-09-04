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

const toolsFilterInput = document.getElementById('tools-filter');
const toolsFilterSummary = document.getElementById('tools-filter-summary');
if (toolsFilterInput) {
  const rows = Array.from(document.querySelectorAll('.convert-row'));
  const groups = Array.from(document.querySelectorAll('.convert-group'));

  const updateToolsFilter = () => {
    const query = toolsFilterInput.value.trim().toLowerCase();
    let visibleRows = 0;

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const match = !query || text.includes(query);
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
      toolsFilterSummary.textContent = query
        ? `${visibleRows} matching conversions`
        : `${rows.length} total conversions`;
    }
  };

  toolsFilterInput.addEventListener('input', updateToolsFilter);
  updateToolsFilter();
}
