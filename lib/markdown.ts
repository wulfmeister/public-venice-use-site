import { Citation } from './types';
import { isValidUrl } from './validation';

// Helper function to escape HTML in titles
export const escapeHtml = (text: string): string => {
  if (typeof document === 'undefined') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converts a markdown-ish chat message into safe HTML.
 *
 * **Sanitization guarantee:** The input `content` is HTML-escaped (`<`, `>`,
 * `&`, `"`, `'` → entities) *before* any markdown transforms are applied.
 * Code blocks and inline code are extracted first and escaped independently.
 * As a result, the returned string never contains raw user-supplied HTML,
 * so it is safe to assign via `innerHTML` without additional sanitization.
 */
export function formatMessage(content: string, citationDocuments: Record<string, Citation> = {}): string {
  const citationIds = Object.keys(citationDocuments);
  // Placeholder arrays: content is extracted before HTML-escaping, replaced with
  // \x00TOKEN{n}\x00 markers, then restored after all transforms are complete.
  const codeBlocks: Array<{ lang: string; code: string }> = [];
  const inlineCode: string[] = [];
  const citationLinks: string[] = [];

  let formatted = content.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ lang, code: code.trim() });
    return `\x00CODEBLOCK${index}\x00`;
  });

  formatted = formatted.replace(/`([^`\n]+)`/g, (match, code) => {
    const index = inlineCode.length;
    inlineCode.push(code);
    return `\x00INLINECODE${index}\x00`;
  });

  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const createCitationLink = (refIndex: number, isOneIndexed = false) => {
    const actualIndex = isOneIndexed ? refIndex - 1 : refIndex;
    const displayNum = actualIndex + 1;

    if (actualIndex < 0 || actualIndex >= citationIds.length) {
      return `<sup class="citation-link citation-missing">[${displayNum}]</sup>`;
    }
    const citationId = citationIds[actualIndex];
    const citation = citationDocuments[citationId];
    if (!citation) {
      return `<sup class="citation-link citation-missing">[${displayNum}]</sup>`;
    }

    const href = citation?.url || (citation?.metadata?.url as string | undefined);
    const hasValidUrl = href && isValidUrl(href);
    const title = citation?.title || (citation?.metadata?.title as string | undefined) || `Source ${displayNum}`;

    if (hasValidUrl) {
      const safeHref = href.replace(/"/g, '%22');
      const html = `<a href="${safeHref}" class="citation-link" data-citation="${citationId}" data-citation-num="${displayNum}" title="${escapeHtml(title)}" target="_blank" rel="noopener noreferrer"><sup>[${displayNum}]</sup></a>`;
      const index = citationLinks.length;
      citationLinks.push(html);
      return `\x00CITATIONLINK${index}\x00`;
    } else {
      return `<sup class="citation-link citation-missing" title="${escapeHtml(title)}">[${displayNum}]</sup>`;
    }
  };

  const replaceCitations = (numbers: string, isOneIndexed: boolean) =>
    numbers.split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0 && !isNaN(parseInt(n)))
      .map((n: string) => createCitationLink(parseInt(n), isOneIndexed))
      .join('');

  formatted = formatted.replace(/\[REF\](\d+(?:\s*,\s*\d+)*)\[\/REF\]/g, (_m, nums) => replaceCitations(nums, false));
  formatted = formatted.replace(/\^(\d+(?:\s*,\s*\d+)*)\^/g, (_m, nums) => replaceCitations(nums, true));
  formatted = formatted.replace(/(?<!["\(])\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_m, nums) => replaceCitations(nums, true));

  const lines = formatted.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inBlockquote = false;
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableAlignments: string[] = [];
  let tableType: 'pipe' | 'tab' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const tabCells = line.includes('\t') ? line.split('\t').map(cell => cell.trim()).filter(cell => cell.length > 0) : [];
    const isTabRow = tabCells.length >= 2;
    if (isTabRow && !inTable) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (inBlockquote) { processedLines.push('</blockquote>'); inBlockquote = false; }

      tableType = 'tab';
      tableHeaders = tabCells;
      tableAlignments = tableHeaders.map(() => 'left');
      inTable = true;
      processedLines.push('<table class="md-table">');
      processedLines.push('<thead><tr>');
      tableHeaders.forEach((header, idx) => {
        const align = tableAlignments[idx] || 'left';
        processedLines.push(`<th style="text-align:${align}">${header}</th>`);
      });
      processedLines.push('</tr></thead><tbody>');
      continue;
    }

    if (isTabRow && inTable && tableType === 'tab') {
      const finalCells = [...tabCells];
      while (finalCells.length < tableHeaders.length) {
        finalCells.push('');
      }
      processedLines.push('<tr>');
      finalCells.forEach((cell, idx) => {
        const align = tableAlignments[idx] || 'left';
        processedLines.push(`<td style="text-align:${align}">${cell}</td>`);
      });
      processedLines.push('</tr>');
      continue;
    }

    const isTableRow = line.includes('|') && line.trim().split('|').length >= 2;
    if (isTableRow && !inTable) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (inBlockquote) { processedLines.push('</blockquote>'); inBlockquote = false; }

      tableType = 'pipe';
      const rawCells = line.split('|');
      tableHeaders = rawCells.slice(1, -1).map(cell => cell.trim());
      if (tableHeaders.length === 0) {
        tableHeaders = rawCells.map(cell => cell.trim()).filter(cell => cell.length > 0);
      }

      const separatorLine = lines[i + 1];
      const isSeparator = separatorLine && /^[\s|:-]+$/.test(separatorLine) && separatorLine.includes('-');

      if (isSeparator) {
        inTable = true;
        processedLines.push('<table class="md-table">');

        const sepCells = separatorLine.split('|').map(c => c.trim()).filter(c => c.length > 0);
        tableAlignments = sepCells.map(cell => {
          if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
          if (cell.endsWith(':')) return 'right';
          return 'left';
        });

        processedLines.push('<thead><tr>');
        tableHeaders.forEach((header, idx) => {
          const align = tableAlignments[idx] || 'left';
          processedLines.push(`<th style="text-align:${align}">${header}</th>`);
        });
        processedLines.push('</tr></thead><tbody>');

        i++;
        continue;
      }
    }

    if (inTable) {
      const isStillTableRow = tableType === 'tab'
        ? (line.includes('\t') && line.split('\t').filter(cell => cell.trim().length > 0).length >= 2)
        : (line.includes('|') && line.trim().split('|').length >= 2);

      if (!isStillTableRow || line.trim() === '') {
        processedLines.push('</tbody></table>');
        inTable = false;
        tableHeaders = [];
        tableAlignments = [];
        tableType = null;
      } else {
        if (tableType === 'pipe') {
          const rawCells = line.split('|');
          const cells = rawCells.slice(1, -1).map(cell => cell.trim());
          const finalCells = (cells.length > 0 ? cells : rawCells.map(c => c.trim()).filter(c => c.length > 0)).slice(0);
          while (finalCells.length < tableHeaders.length) {
            finalCells.push('');
          }

          processedLines.push('<tr>');
          finalCells.forEach((cell, idx) => {
            const align = tableAlignments[idx] || 'left';
            processedLines.push(`<td style="text-align:${align}">${cell}</td>`);
          });
          processedLines.push('</tr>');
          continue;
        }

        if (tableType === 'tab') {
          const finalCells = line.split('\t').map(cell => cell.trim()).filter(cell => cell.length > 0);
          while (finalCells.length < tableHeaders.length) {
            finalCells.push('');
          }
          processedLines.push('<tr>');
          finalCells.forEach((cell, idx) => {
            const align = tableAlignments[idx] || 'left';
            processedLines.push(`<td style="text-align:${align}">${cell}</td>`);
          });
          processedLines.push('</tr>');
          continue;
        }
      }
    }

    if (/^#{1,6}\s/.test(line)) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (inBlockquote) { processedLines.push('</blockquote>'); inBlockquote = false; }
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = parseInt(match[1].length.toString());
        const text = match[2];
        processedLines.push(`<h${level} class="md-header">${text}</h${level}>`);
        continue;
      }
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (inBlockquote) { processedLines.push('</blockquote>'); inBlockquote = false; }
      processedLines.push('<hr class="md-hr">');
      continue;
    }

    if (/^&gt;\s?/.test(line)) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      if (!inBlockquote) {
        processedLines.push('<blockquote class="md-blockquote">');
        inBlockquote = true;
      }
      processedLines.push(line.replace(/^&gt;\s?/, '') + '<br>');
      continue;
    } else if (inBlockquote) {
      processedLines.push('</blockquote>');
      inBlockquote = false;
    }

    const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (ulMatch) {
      if (inBlockquote) { processedLines.push('</blockquote>'); inBlockquote = false; }
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push('</ol>');
        processedLines.push('<ul class="md-list">');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${ulMatch[3]}</li>`);
      continue;
    }

    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inBlockquote) { processedLines.push('</blockquote>'); inBlockquote = false; }
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push('</ul>');
        processedLines.push('<ol class="md-list">');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${olMatch[3]}</li>`);
      continue;
    }

    if (inList && line.trim() !== '') {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }

    processedLines.push(line);
  }

  if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  if (inBlockquote) processedLines.push('</blockquote>');
  if (inTable) {
    processedLines.push('</tbody>');
    processedLines.push('</table>');
    tableType = null;
  }

  formatted = processedLines.join('\n');

  // Strip stray target/rel attributes that Venice sometimes injects into raw responses.
  // Citation links survive this because they use \x00CITATIONLINK placeholders above.
  formatted = formatted.replace(/target\s*=\s*"[^"]*"\s*rel\s*=\s*"[^"]*"\s*>/gi, '');
  formatted = formatted.replace(/&quot;\s*target\s*=\s*&quot;[^&]*&quot;\s*rel\s*=\s*&quot;[^&]*&quot;\s*&gt;/gi, '');
  formatted = formatted.replace(/target\s*=\s*'_blank'\s*rel\s*=\s*'noopener noreferrer'\s*>/gi, '');
  formatted = formatted.replace(/rel\s*=\s*"noopener noreferrer"\s*>?/gi, '');
  formatted = formatted.replace(/&quot;\s*rel\s*=\s*&quot;noopener noreferrer&quot;\s*&gt;?/gi, '');

  // Remove duplicate/malformed citation anchor tags Venice sometimes emits
  formatted = formatted.replace(/<\/?a[^>]*>\[?\d+\]?\s*\[REF\]?\d+<\/a>/gi, '');

  formatted = formatted.replace(/\[(\d+)\]\s*["\][^>]*\[(\1)\]\s*/gi, '[$1]');
  formatted = formatted.replace(/\[(\d+)\]\s*;?\s*\[(\1)\]/gi, '[$1]');

  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match: string, text: string, href: string) => {
    const trimmedHref = href.trim().replace(/^<|>$/g, '');
    if (!isValidUrl(trimmedHref)) {
      return text;
    }
    const safeHref = trimmedHref.replace(/"/g, '%22');
    return `<a href="${safeHref}" target="_blank" rel="noopener" class="md-link">${text}</a>`;
  });

  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  formatted = formatted.replace(/(?<![\\*])\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  formatted = formatted.replace(/(?<![\\w])_([^_\n]+)_(?!\w)/g, '<em>$1</em>');

  formatted = formatted.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  formatted = formatted.replace(/\n(?!<\/?(ul|ol|li|blockquote|h[1-6]|hr|pre|table|thead|tbody|tr|th|td))/g, '<br>\n');

  formatted = formatted.replace(/(<br>\s*){3,}/g, '<br><br>');

  formatted = formatted.replace(/<br>\s*(<(table|ul|ol|blockquote|h[1-6]|hr|pre))/g, '$1');

  formatted = formatted.replace(/(<\/(table|ul|ol|blockquote|h[1-6]|pre)>)\s*<br>/g, '$1');

  formatted = formatted.replace(/\x00CITATIONLINK(\d+)\x00/g, (match, index) => {
    return citationLinks[parseInt(index)];
  });

  const escapeCodeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  formatted = formatted.replace(/\x00CODEBLOCK(\d+)\x00/g, (match, index) => {
    const block = codeBlocks[parseInt(index)];
    const langClass = block.lang ? ` class="language-${block.lang}"` : '';
    return `<pre class="md-codeblock"><code${langClass}>${escapeCodeHtml(block.code)}</code></pre>`;
  });

  formatted = formatted.replace(/\x00INLINECODE(\d+)\x00/g, (match, index) => {
    return `<code class="md-inline-code">${escapeCodeHtml(inlineCode[parseInt(index)])}</code>`;
  });

  return formatted;
}
