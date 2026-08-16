export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 150;

/**
 * Rough token estimate. The Python side of this repo uses tiktoken, but that is
 * not available in React Native -- and for context budgeting an approximation is
 * enough, since we only need to know when to stop adding chunks.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ChunkOptions {
  size?: number;
  overlap?: number;
}

/**
 * Splits text into overlapping chunks, preferring to break at a paragraph or
 * sentence boundary so a chunk never ends mid-word.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const size = options.size ?? CHUNK_SIZE;
  const overlap = Math.min(options.overlap ?? CHUNK_OVERLAP, size - 1);

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  if (normalized.length <= size) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);

    // Only hunt for a boundary when we're not already at the very end.
    if (end < normalized.length) {
      const boundary = findBoundary(normalized, start, end);
      if (boundary > start) end = boundary;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;

    // Step forward, leaving `overlap` characters of context behind. Guard against
    // a boundary landing so early that we'd loop forever.
    const next = end - overlap;
    start = next > start ? next : end;
  }

  return chunks;
}

/**
 * Looks backwards from `end` for the last paragraph break, then sentence end,
 * then whitespace. Returns `end` unchanged when nothing suitable is close by.
 */
function findBoundary(text: string, start: number, end: number): number {
  const window = text.slice(start, end);
  // Don't accept a boundary in the first half -- that would produce tiny chunks.
  const minimum = Math.floor(window.length / 2);

  const paragraph = window.lastIndexOf('\n\n');
  if (paragraph > minimum) return start + paragraph + 2;

  const sentence = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('! '),
    window.lastIndexOf('? '),
    window.lastIndexOf('\n'),
  );
  if (sentence > minimum) return start + sentence + 1;

  const space = window.lastIndexOf(' ');
  if (space > minimum) return start + space + 1;

  return end;
}

const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'json', 'log'];

/** Formats supported for upload. PDF needs a parser we don't ship yet. */
export function isSupportedTextFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && TEXT_EXTENSIONS.includes(ext);
}

export const SUPPORTED_FILE_LABEL = 'TXT, MD, CSV, JSON';
