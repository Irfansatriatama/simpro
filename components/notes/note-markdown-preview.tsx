'use client';

import { renderNoteMarkdown } from '@/lib/render-note-markdown';
import { cn } from '@/lib/utils';

export function NoteMarkdownPreview(props: {
  markdown: string;
  className?: string;
}) {
  const { markdown, className } = props;
  return (
    <div
      className={cn(
        'note-md-preview min-h-[240px] rounded-md border border-border bg-card/50 p-4 text-sm leading-relaxed text-foreground lg:min-h-[360px]',
        '[&_.note-md-root]:space-y-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_hr]:my-4 [&_hr]:border-border',
        '[&_a]:text-primary [&_a]:underline',
        className,
      )}
      // eslint-disable-next-line react/no-danger -- konten hasil escape + filter href
      dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(markdown) }}
    />
  );
}
