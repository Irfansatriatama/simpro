'use client';

import { Bold, Heading1, Heading2, Italic, List } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

function wrapSelection(
  value: string,
  start: number,
  end: number,
  wrap: string,
): { value: string; start: number; end: number } {
  const sel = value.slice(start, end);
  const inner = sel.length > 0 ? sel : '';
  const chunk = `${wrap}${inner}${wrap}`;
  const next = value.slice(0, start) + chunk + value.slice(end);
  const caret = start + wrap.length + inner.length + wrap.length;
  return { value: next, start: caret, end: caret };
}

function prefixLine(
  value: string,
  start: number,
  end: number,
  prefix: string,
): { value: string; start: number; end: number } {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);
  const stripped = line.replace(/^(#{1,6}\s*)/, '');
  const nextLine = `${prefix}${stripped}`;
  const next =
    value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  const delta = nextLine.length - line.length;
  return {
    value: next,
    start: start + delta,
    end: end + delta,
  };
}

function bulletLine(
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);
  const nextLine = line.trim().length === 0 ? '- ' : `- ${line.replace(/^[-*]\s+/, '')}`;
  const next =
    value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  const delta = nextLine.length - line.length;
  return {
    value: next,
    start: Math.min(start + delta, next.length),
    end: Math.min(end + delta, next.length),
  };
}

type LineTransform = (
  value: string,
  start: number,
  end: number,
) => { value: string; start: number; end: number };

const transforms: Record<string, LineTransform> = {
  bold: (v, a, b) => wrapSelection(v, a, b, '**'),
  italic: (v, a, b) => wrapSelection(v, a, b, '*'),
  h1: (v, a, b) => prefixLine(v, a, b, '# '),
  h2: (v, a, b) => prefixLine(v, a, b, '## '),
  ul: (v, a, b) => bulletLine(v, a, b),
};

export function NoteEditorToolbar(props: {
  disabled?: boolean;
  value: string;
  onChange: (next: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { disabled, value, onChange, textareaRef } = props;
  const selRef = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const r = selRef.current;
    const el = textareaRef.current;
    if (!r || !el) return;
    selRef.current = null;
    el.setSelectionRange(r.start, r.end);
    el.focus();
  }, [value, textareaRef]);

  function run(key: keyof typeof transforms) {
    const el = textareaRef.current;
    if (!el || disabled) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const r = transforms[key](value, start, end);
    onChange(r.value);
    selRef.current = { start: r.start, end: r.end };
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface/50 p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('bold')}
        aria-label="Tebal"
        title="Tebal"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('italic')}
        aria-label="Miring"
        title="Miring"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('h1')}
        aria-label="Judul 1"
        title="Judul baris (# )"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('h2')}
        aria-label="Judul 2"
        title="Subjudul (## )"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('ul')}
        aria-label="Daftar"
        title="Daftar (- )"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
