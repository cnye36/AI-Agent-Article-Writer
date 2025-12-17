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
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Internal Links</h2>

      {links.outgoing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-zinc-400 mb-2">
            Outgoing ({links.outgoing.length})
          </h3>
          <div className="space-y-2">
            {links.outgoing.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-blue-400">
                  &quot;{link.anchor_text}&quot;
                </span>
                <span className="text-zinc-500">→</span>
                <span>{link.target_article?.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.incoming.length > 0 && (
        <div>
          <h3 className="text-sm text-zinc-400 mb-2">
            Incoming ({links.incoming.length})
          </h3>
          <div className="space-y-2">
            {links.incoming.map((link, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm"
              >
                <span>{link.source_article?.title}</span>
                <span className="text-zinc-500">→</span>
                <span className="text-blue-400">
                  &quot;{link.anchor_text}&quot;
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.outgoing.length === 0 && links.incoming.length === 0 && (
        <p className="text-zinc-500 text-sm">No internal links yet</p>
      )}
    </section>
  );
}

