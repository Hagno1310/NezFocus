// REQ-MSG-02, syntax of C-10 (19/11/2026); never reads HTML, only http(s) links (NFR-SEC-09).

export type Inline =
  | { t: 'text'; text: string }
  | { t: 'bold' | 'italic' | 'strike' | 'spoiler'; children: Inline[] }
  | { t: 'code'; text: string }
  | { t: 'link'; url: string }
  // REQ-MSG-03: the tokens of P2-A3.1 (#99); id of `everyone` is 'everyone' or 'here'.
  | { t: 'mention'; kind: MentionKind; id: string };

export type MentionKind = 'user' | 'role' | 'channel' | 'everyone';
export type MentionNode = Extract<Inline, { t: 'mention' }>;

export type Block =
  | { t: 'paragraph'; children: Inline[] }
  | { t: 'quote'; children: Inline[] }
  | { t: 'codeblock'; text: string };

type Span = 'bold' | 'italic' | 'strike' | 'spoiler';
// Longest first, so ** is tried before *.
const MARKS: [string, Span][] = [
  ['||', 'spoiler'],
  ['**', 'bold'],
  ['~~', 'strike'],
  ['*', 'italic'],
  ['_', 'italic'],
];

const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/;
const isWord = (c: string | undefined) => c !== undefined && WORD.test(c);
const isSpace = (c: string | undefined) => c === undefined || SPACE.test(c);

// Where `mark` closes, skipping code spans and, for a single *, the ** of a nested bold.
function findClose(s: string, from: number, mark: string): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] === '`') {
      const end = s.indexOf('`', j + 1);
      if (end > j + 1) j = end;
      continue;
    }
    if (mark === '*' && s.startsWith('**', j)) {
      j++;
      continue;
    }
    if (
      j > from &&
      s.startsWith(mark, j) &&
      !isSpace(s[j - 1]) &&
      !(mark === '_' && isWord(s[j + 1]))
    )
      return j;
  }
  return -1;
}

const URL_START = /^https?:\/\/[^\s<>]+/;
const TRAILING = new Set([
  '.',
  ',',
  ';',
  ':',
  '!',
  '?',
  "'",
  '"',
  '*',
  '_',
  '~',
  '|',
]);

// "https://a.vn/x_(y))." → "https://a.vn/x_(y)": punctuation after a link is not part of it.
function trimUrl(url: string): string {
  let u = url;
  for (;;) {
    const last = u.at(-1)!;
    const unbalanced =
      last === ')' && u.split('(').length < u.split(')').length;
    if (!TRAILING.has(last) && !unbalanced) return u;
    u = u.slice(0, -1);
  }
}

function linkAt(s: string, i: number): string | null {
  if (isWord(s[i - 1])) return null;
  const m = URL_START.exec(s.slice(i));
  if (!m) return null;
  const url = trimUrl(m[0]);
  return /^https?:\/\/./.test(url) ? url : null;
}

const TOKEN = /^<(@&|@|#)(\d{1,20})>/;
const EVERYONE = /^@(everyone|here)(?![\p{L}\p{N}_])/u;

function mentionAt(s: string, i: number): [MentionNode, number] | null {
  const token = TOKEN.exec(s.slice(i, i + 25));
  if (token) {
    const kind =
      token[1] === '@&' ? 'role' : token[1] === '#' ? 'channel' : 'user';
    return [{ t: 'mention', kind, id: token[2]! }, token[0].length];
  }
  // Same rule as parseMentions in shared: not after a word, a dot or another @.
  if (s[i] !== '@' || isWord(s[i - 1]) || s[i - 1] === '.' || s[i - 1] === '@')
    return null;
  const word = EVERYONE.exec(s.slice(i));
  return word
    ? [{ t: 'mention', kind: 'everyone', id: word[1]! }, word[0].length]
    : null;
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let plain = '';
  const push = (node: Inline) => {
    if (plain) out.push({ t: 'text', text: plain });
    plain = '';
    out.push(node);
  };
  let i = 0;
  outer: while (i < s.length) {
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i + 1) {
        push({ t: 'code', text: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    for (const [mark, t] of MARKS) {
      if (!s.startsWith(mark, i)) continue;
      const opens =
        !isSpace(s[i + mark.length]) && !(mark === '_' && isWord(s[i - 1]));
      const close = opens ? findClose(s, i + mark.length, mark) : -1;
      if (close < 0) break; // not a mark here: one plain character, then look again
      push({ t, children: parseInline(s.slice(i + mark.length, close)) });
      i = close + mark.length;
      continue outer;
    }
    const mention = mentionAt(s, i);
    if (mention) {
      push(mention[0]);
      i += mention[1];
      continue;
    }
    const url = linkAt(s, i);
    if (url) {
      push({ t: 'link', url });
      i += url.length;
      continue;
    }
    plain += s[i];
    i++;
  }
  if (plain) out.push({ t: 'text', text: plain });
  return out;
}

const FENCE_OPEN = /^```[\w+-]*$/;

export function parseMessage(s: string): Block[] {
  if (!s) return [];
  const lines = s.split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length)
      blocks.push({ t: 'paragraph', children: parseInline(para.join('\n')) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE_OPEN.test(line)) {
      const end = lines.findIndex((l, k) => k > i && l.trim() === '```');
      if (end > 0) {
        flush();
        blocks.push({
          t: 'codeblock',
          text: lines.slice(i + 1, end).join('\n'),
        });
        i = end;
        continue;
      }
    }
    if (line.startsWith('> ')) {
      flush();
      const quoted: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('> '))
        quoted.push(lines[i++]!.slice(2));
      i--;
      blocks.push({ t: 'quote', children: parseInline(quoted.join('\n')) });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

type Speak = (m: MentionNode) => string;
export const rawMention: Speak = (m) =>
  m.kind === 'everyone' ? `@${m.id}` : m.kind === 'channel' ? '#' : '@';

const spokenRuns = (nodes: Inline[], spoiler: string, speak: Speak): string =>
  nodes
    .map((n) =>
      n.t === 'text' || n.t === 'code'
        ? n.text
        : n.t === 'link'
          ? n.url
          : n.t === 'mention'
            ? speak(n)
            : n.t === 'spoiler'
              ? spoiler
              : spokenRuns(n.children, spoiler, speak),
    )
    .join('');

// C-10: the message is read as one element, marks dropped and spoilers still covered.
export const spokenText = (
  blocks: Block[],
  spoiler: string,
  speak: Speak = rawMention,
) =>
  blocks
    .map((b) =>
      b.t === 'codeblock' ? b.text : spokenRuns(b.children, spoiler, speak),
    )
    .join('\n');

const runLinks = (nodes: Inline[]): string[] =>
  nodes.flatMap((n) =>
    n.t === 'link'
      ? [n.url]
      : n.t === 'bold' || n.t === 'italic' || n.t === 'strike'
        ? runLinks(n.children)
        : [],
  );

// Links a screen reader reaches through the message's accessibilityActions.
export const linksOf = (blocks: Block[]) =>
  blocks.flatMap((b) => (b.t === 'codeblock' ? [] : runLinks(b.children)));
