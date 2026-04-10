/**
 * Markdown ringan ke HTML untuk mode baca (seperti preview Trackly).
 * Konten sudah milik pengguna; tautan dibatasi ke http(s) dan mailto.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:/i.test(u)) return u;
  return null;
}

/**
 * Render Markdown sederhana ke HTML aman (tanpa script).
 */
export function renderNoteMarkdown(md: string): string {
  if (!md) return '';
  let html = escapeHtml(md)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      (_m, label: string, url: string) => {
        const href = safeHref(String(url));
        if (!href)
          return `<span class="text-muted-foreground">${label}</span>`;
        return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      },
    )
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');

  html = html.replace(/(<li>.*?<\/li>(?:\n|$))+/g, '<ul>$&</ul>');
  html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />');
  return `<div class="note-md-root"><p>${html}</p></div>`;
}
