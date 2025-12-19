"use client";

import type { ArticleLink } from "@/types";

interface ArticleLinksSectionProps {
  links: {
    outgoing: ArticleLink[];
    incoming: ArticleLink[];
  };
}

export function ArticleLinksSection({ links }: ArticleLinksSectionProps) {
  return (
    <section className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Internal Links</h2>

      {links.outgoing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-slate-700 dark:text-zinc-400 mb-2">
            Outgoing ({links.outgoing.length})
          </h3>
          <div className="space-y-2">
            {links.outgoing.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-slate-900 dark:text-white"
              >
                <span className="text-blue-600 dark:text-blue-400">
                  &quot;{link.anchor_text}&quot;
                </span>
                <span className="text-slate-500 dark:text-zinc-500">→</span>
                <span>{link.target_article?.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.incoming.length > 0 && (
        <div>
          <h3 className="text-sm text-slate-700 dark:text-zinc-400 mb-2">
            Incoming ({links.incoming.length})
          </h3>
          <div className="space-y-2">
            {links.incoming.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-slate-900 dark:text-white"
              >
                <span>{link.source_article?.title}</span>
                <span className="text-slate-500 dark:text-zinc-500">→</span>
                <span className="text-blue-600 dark:text-blue-400">
                  &quot;{link.anchor_text}&quot;
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.outgoing.length === 0 && links.incoming.length === 0 && (
        <p className="text-slate-600 dark:text-zinc-500 text-sm">No internal links yet</p>
      )}
    </section>
  );
}

