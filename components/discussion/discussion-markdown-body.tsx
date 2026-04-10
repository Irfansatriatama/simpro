'use client';

import { renderNoteMarkdown } from '@/lib/render-note-markdown';
import { cn } from '@/lib/utils';

/** Konten diskusi / balasan: subset markdown aman (sama seperti catatan). */
export function DiscussionMarkdownBody(props: {
  content: string;
  className?: string;
}) {
  const { content, className } = props;
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-foreground',
        '[&_.note-md-root]:space-y-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_hr]:my-3 [&_hr]:border-border',
        '[&_a]:break-all [&_a]:text-primary [&_a]:underline',
        className,
      )}
      // eslint-disable-next-line react/no-danger -- HTML dari escape + filter href
      dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(content) }}
    />
  );
}
