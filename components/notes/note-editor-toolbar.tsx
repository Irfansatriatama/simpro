'use client';

import {
  Bold,
  Clock,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
} from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

export type NoteFormatKey =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'ul'
  | 'ol'
  | 'timestamp';

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

function insertAtCursor(
  value: string,
  start: number,
  end: number,
  insert: string,
): { value: string; start: number; end: number } {
  const next = value.slice(0, start) + insert + value.slice(end);
  const caret = start + insert.length;
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
  const nextLine =
    line.trim().length === 0
      ? '- '
      : `- ${line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '')}`;
  const next =
    value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  const delta = nextLine.length - line.length;
  return {
    value: next,
    start: Math.min(start + delta, next.length),
    end: Math.min(end + delta, next.length),
  };
}

function orderedLine(
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const line = value.slice(lineStart, lineEnd);
  const nextLine =
    line.trim().length === 0
      ? '1. '
      : `1. ${line.replace(/^\d+\.\s+/, '').replace(/^[-*]\s+/, '')}`;
  const next =
    value.slice(0, lineStart) + nextLine + value.slice(lineEnd);
  const delta = nextLine.length - line.length;
  return {
    value: next,
    start: Math.min(start + delta, next.length),
    end: Math.min(end + delta, next.length),
  };
}

/** Untuk pintasan keyboard di textarea. */
export function applyNoteFormat(
  key: NoteFormatKey,
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } {
  switch (key) {
    case 'bold':
      return wrapSelection(value, start, end, '**');
    case 'italic':
      return wrapSelection(value, start, end, '*');
    case 'strikethrough':
      return wrapSelection(value, start, end, '~~');
    case 'code':
      return wrapSelection(value, start, end, '`');
    case 'h1':
      return prefixLine(value, start, end, '# ');
    case 'h2':
      return prefixLine(value, start, end, '## ');
    case 'h3':
      return prefixLine(value, start, end, '### ');
    case 'ul':
      return bulletLine(value, start, end);
    case 'ol':
      return orderedLine(value, start, end);
    case 'timestamp': {
      const stamp = new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return insertAtCursor(value, start, end, stamp);
    }
    default:
      return { value, start, end };
  }
}

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

  function run(key: NoteFormatKey) {
    const el = textareaRef.current;
    if (!el || disabled) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const r = applyNoteFormat(key, value, start, end);
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
        title="Tebal (Ctrl+B)"
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
        title="Miring (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('strikethrough')}
        aria-label="Coret"
        title="Coret (Ctrl+Shift+X)"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('code')}
        aria-label="Kode"
        title="Kode inline"
      >
        <Code className="h-4 w-4" />
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
        onClick={() => run('h3')}
        aria-label="Judul 3"
        title="### "
      >
        <Heading3 className="h-4 w-4" />
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('ol')}
        aria-label="Daftar bernomor"
        title="Daftar bernomor (1. )"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        disabled={disabled}
        onClick={() => run('timestamp')}
        aria-label="Sisipkan tanggal & waktu"
        title="Tanggal & waktu lokal"
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
}
