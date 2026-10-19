// The markdown ELLIE writes (B-24: bold for a key figure, sometimes italics
// and a short list) read into blocks the chat paints with the v2 type. What
// is not supported is shown as plain text, never as marks: no ###, ** or *
// ever reach the screen. Pure.

export type MarkdownSpan = { text: string; bold?: boolean; italic?: boolean };

export type MarkdownBlock =
  | { kind: 'paragraph'; spans: MarkdownSpan[] }
  // A "### Title": shown as a bold line (the chat has no titles).
  | { kind: 'heading'; spans: MarkdownSpan[] }
  | { kind: 'bullets'; items: MarkdownSpan[][] }
  | { kind: 'numbered'; items: { number: number; spans: MarkdownSpan[] }[] };

const BULLET = /^\s*[-*+•]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const FENCE = /^\s*```/;

// Marks that were not closed, and other syntax that must not show.
function cleanText(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/`/g, '')
    .replace(/\*{2,}|_{2,}/g, '')
    .replace(/(^|\s)\*(?=\S)/g, '$1')
    .replace(/(\S)\*(?=\s|$|[.,;:!?)])/g, '$1')
    .replace(/^\s*#{1,6}\s+/g, '');
}

function push(spans: MarkdownSpan[], text: string, style: { bold?: boolean; italic?: boolean }) {
  const clean = cleanText(text);
  if (!clean) {
    return;
  }
  const last = spans[spans.length - 1];
  if (last && Boolean(last.bold) === Boolean(style.bold) && Boolean(last.italic) === Boolean(style.italic)) {
    last.text += clean;
    return;
  }
  spans.push({ text: clean, ...(style.bold ? { bold: true } : {}), ...(style.italic ? { italic: true } : {}) });
}

// ***both***, **bold** / __bold__, *italic*. (A single _ is left alone: it
// is part of words more often than italics.)
const INLINE =
  /\*\*\*(\S(?:[^*]*?\S)?)\*\*\*|\*\*(\S(?:[^*]*?\S)?)\*\*|__(\S(?:[^_]*?\S)?)__|\*(\S(?:[^*]*?\S)?)\*/g;

export function parseInline(text: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let last = 0;
  const pattern = new RegExp(INLINE.source, 'g');
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const index = match.index;
    push(spans, text.slice(last, index), {});
    const [, both, bold, boldUnderscore, italic] = match;
    if (both !== undefined) {
      push(spans, both, { bold: true, italic: true });
    } else if (bold !== undefined || boldUnderscore !== undefined) {
      // Inside bold, a nested *italic* keeps only the bold.
      push(spans, (bold ?? boldUnderscore).replace(/\*/g, ''), { bold: true });
    } else {
      push(spans, italic, { italic: true });
    }
    last = index + match[0].length;
  }
  push(spans, text.slice(last), {});
  return spans;
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      const spans = parseInline(paragraph.join('\n'));
      if (spans.length > 0) {
        blocks.push({ kind: 'paragraph', spans });
      }
      paragraph = [];
    }
  };

  source.replace(/\r\n?/g, '\n').split('\n').forEach(line => {
    if (!line.trim() || RULE.test(line) || FENCE.test(line)) {
      flush();
      return;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const spans = parseInline(heading[1]).map(span => ({ ...span, bold: true }));
      if (spans.length > 0) {
        blocks.push({ kind: 'heading', spans });
      }
      return;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      const previous = blocks[blocks.length - 1];
      const spans = parseInline(bullet[1]);
      if (previous?.kind === 'bullets') {
        previous.items.push(spans);
      } else {
        blocks.push({ kind: 'bullets', items: [spans] });
      }
      return;
    }
    const numbered = NUMBERED.exec(line);
    if (numbered) {
      flush();
      const previous = blocks[blocks.length - 1];
      const item = { number: Number(numbered[1]), spans: parseInline(numbered[2]) };
      if (previous?.kind === 'numbered') {
        previous.items.push(item);
      } else {
        blocks.push({ kind: 'numbered', items: [item] });
      }
      return;
    }
    paragraph.push(line.trim());
  });
  flush();
  return blocks;
}

// The text without any mark (accessibility, copy).
export function plainMarkdown(source: string): string {
  return parseMarkdown(source)
    .map(block => {
      if (block.kind === 'bullets') {
        return block.items.map(item => `• ${item.map(span => span.text).join('')}`).join('\n');
      }
      if (block.kind === 'numbered') {
        return block.items.map(item => `${item.number}. ${item.spans.map(span => span.text).join('')}`).join('\n');
      }
      return block.spans.map(span => span.text).join('');
    })
    .join('\n\n');
}
