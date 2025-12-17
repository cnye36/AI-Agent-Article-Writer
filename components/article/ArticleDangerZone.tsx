"use client";

interface ArticleDangerZoneProps {
  onDelete: () => void;
}

export function ArticleDangerZone({ onDelete }: ArticleDangerZoneProps) {
  return (
    <section className="bg-red-900/20 border border-red-800/50 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
      <p className="text-sm text-zinc-400 mb-4">
        Once you delete an article, there is no going back. Please be certain.
      </p>
      <button
        onClick={onDelete}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium"
      >
        Delete Article
      </button>
    </section>
  );
}

