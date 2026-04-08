export function GuideArticle(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { title, description, children } = props;
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div
        className={[
          'space-y-6 text-sm leading-relaxed text-muted-foreground',
          '[&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:first:mt-0',
          '[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground',
          '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_li]:mt-1',
          '[&_strong]:text-foreground',
          '[&_a]:text-primary [&_a]:underline hover:[&_a]:no-underline',
          '[&_code]:rounded [&_code]:bg-border/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-foreground',
        ].join(' ')}
      >
        {children}
      </div>
    </article>
  );
}
