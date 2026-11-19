import { describe, expect, it } from 'vitest';
import { parseInline, parseMessage, type Inline } from './markdown';

const text = (t: string): Inline => ({ t: 'text', text: t });

describe('parseInline: MSG-02 AC1 (cú pháp chốt 19/11/2026, C-10)', () => {
  it('plain text stays one text node', () => {
    expect(parseInline('Ok, mình vào sớm giữ chỗ')).toEqual([
      text('Ok, mình vào sớm giữ chỗ'),
    ]);
  });

  it('**đậm**, *nghiêng*, _nghiêng_, ~~gạch~~, ||spoiler||', () => {
    expect(parseInline('a **b** c')).toEqual([
      text('a '),
      { t: 'bold', children: [text('b')] },
      text(' c'),
    ]);
    expect(parseInline('*b*')).toEqual([
      { t: 'italic', children: [text('b')] },
    ]);
    expect(parseInline('_b_')).toEqual([
      { t: 'italic', children: [text('b')] },
    ]);
    expect(parseInline('~~b~~')).toEqual([
      { t: 'strike', children: [text('b')] },
    ]);
    expect(parseInline('||đáp án 8π/3||')).toEqual([
      { t: 'spoiler', children: [text('đáp án 8π/3')] },
    ]);
  });

  it('`code` keeps its content as is, Markdown and links included', () => {
    expect(parseInline('gõ `**x** https://a.vn` nhé')).toEqual([
      text('gõ '),
      { t: 'code', text: '**x** https://a.vn' },
      text(' nhé'),
    ]);
  });

  it('nests: **đậm _nghiêng_** and ||**đậm**||', () => {
    expect(parseInline('**đậm _nghiêng_**')).toEqual([
      {
        t: 'bold',
        children: [text('đậm '), { t: 'italic', children: [text('nghiêng')] }],
      },
    ]);
    expect(parseInline('||**x**||')).toEqual([
      { t: 'spoiler', children: [{ t: 'bold', children: [text('x')] }] },
    ]);
  });

  it('*nghiêng **đậm** nghiêng*: the ** inside does not close the *', () => {
    expect(parseInline('*a **b** c*')).toEqual([
      {
        t: 'italic',
        children: [
          text('a '),
          { t: 'bold', children: [text('b')] },
          text(' c'),
        ],
      },
    ]);
  });

  it('unclosed marks stay as typed: **chưa đóng, `code, ||x, ~~x', () => {
    for (const s of ['**chưa đóng', '`code', '||x', '~~x', '_x', '*x'])
      expect(parseInline(s)).toEqual([text(s)]);
  });

  it('**a* is a literal * then italic a, as CommonMark', () => {
    expect(parseInline('**a*')).toEqual([
      text('*'),
      { t: 'italic', children: [text('a')] },
    ]);
  });

  it('marks need text right inside: 2 * 3 * 4 and ** x ** stay plain', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([text('2 * 3 * 4')]);
    expect(parseInline('** x **')).toEqual([text('** x **')]);
    expect(parseInline('****')).toEqual([text('****')]);
  });

  it('_ inside a word is not italic: tich_phan_boi', () => {
    expect(parseInline('file tich_phan_boi.pdf')).toEqual([
      text('file tich_phan_boi.pdf'),
    ]);
  });
});

describe('parseInline: links (MSG-02 AC4, NFR-SEC-09)', () => {
  it('an http(s) link is a link, without the punctuation after it', () => {
    expect(
      parseInline('Xem https://vi.wikipedia.org/wiki/Tích_phân_bội, nhé'),
    ).toEqual([
      text('Xem '),
      { t: 'link', url: 'https://vi.wikipedia.org/wiki/Tích_phân_bội' },
      text(', nhé'),
    ]);
  });

  it('keeps balanced parentheses, drops an unbalanced closing one', () => {
    expect(parseInline('(https://a.vn/x_(y))')).toEqual([
      text('('),
      { t: 'link', url: 'https://a.vn/x_(y)' },
      text(')'),
    ]);
  });

  it('[click](javascript:alert(1)) is plain text, nothing to press', () => {
    expect(parseInline('[click](javascript:alert(1))')).toEqual([
      text('[click](javascript:alert(1))'),
    ]);
  });

  it('no masked links: [chữ](url) shows as typed, the url inside still pressable', () => {
    expect(parseInline('[đề](https://a.vn/de)')).toEqual([
      text('[đề]('),
      { t: 'link', url: 'https://a.vn/de' },
      text(')'),
    ]);
  });

  it('HTML is never read: <b>x</b> stays as typed', () => {
    expect(parseInline('<b>x</b>')).toEqual([text('<b>x</b>')]);
  });

  it('only http and https: ftp:// or "https://" alone are text', () => {
    expect(parseInline('ftp://a.vn https://')).toEqual([
      text('ftp://a.vn https://'),
    ]);
  });

  it('a link inside bold is still a link', () => {
    expect(parseInline('**https://a.vn**')).toEqual([
      { t: 'bold', children: [{ t: 'link', url: 'https://a.vn' }] },
    ]);
  });
});

describe('parseMessage: blocks', () => {
  it('lines stay in one paragraph, line breaks kept', () => {
    expect(parseMessage('dòng 1\ndòng 2')).toEqual([
      { t: 'paragraph', children: [text('dòng 1\ndòng 2')] },
    ]);
  });

  it('"> " lines are a quote; the next plain line is a new paragraph', () => {
    expect(parseMessage('> trích **đậm**\n> dòng 2\ntrả lời')).toEqual([
      {
        t: 'quote',
        children: [
          text('trích '),
          { t: 'bold', children: [text('đậm')] },
          text('\ndòng 2'),
        ],
      },
      { t: 'paragraph', children: [text('trả lời')] },
    ]);
  });

  it('">" without the space is not a quote', () => {
    expect(parseMessage('>x')).toEqual([
      { t: 'paragraph', children: [text('>x')] },
    ]);
  });

  it('``` fences make a code block, kept as typed (language line dropped)', () => {
    expect(
      parseMessage('Code:\n```ts\nconst a = **1**;\n  b\n```\nxong'),
    ).toEqual([
      { t: 'paragraph', children: [text('Code:')] },
      { t: 'codeblock', text: 'const a = **1**;\n  b' },
      { t: 'paragraph', children: [text('xong')] },
    ]);
  });

  it('an unclosed fence is plain text', () => {
    expect(parseMessage('```\nabc')).toEqual([
      { t: 'paragraph', children: [text('```\nabc')] },
    ]);
  });

  it('marks do not run across a code block', () => {
    expect(parseMessage('**a\n```\nx\n```\nb**')).toEqual([
      { t: 'paragraph', children: [text('**a')] },
      { t: 'codeblock', text: 'x' },
      { t: 'paragraph', children: [text('b**')] },
    ]);
  });

  it('empty text gives nothing', () => {
    expect(parseMessage('')).toEqual([]);
  });
});
