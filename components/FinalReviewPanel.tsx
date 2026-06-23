'use client';

import { useEffect, useState } from 'react';
import type { Listing, PublicationChecklist } from '@/lib/types';

interface FinalReviewPanelProps {
  listing: Listing;
  publication: PublicationChecklist;
  onSaveCopy: (copy: Listing['listingCopy']) => Promise<void>;
  onPublish: () => Promise<void>;
  onExport: () => Promise<void>;
}

export function FinalReviewPanel({
  listing,
  publication,
  onSaveCopy,
  onPublish,
  onExport,
}: FinalReviewPanelProps) {
  const [copy, setCopy] = useState(listing.listingCopy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setCopy(listing.listingCopy), [listing.listingCopy]);

  async function save(approved: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      await onSaveCopy({ ...copy, approved });
      setMessage(approved ? 'Listing copy approved.' : 'Draft saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the listing copy.');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setMessage(null);
    try {
      await onPublish();
      setMessage('Property published successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish the property.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-lg font-semibold">Final review</h2>
          <p className="mt-1 text-xs text-ink/50">
            Zenrth handles the checks automatically. Review the final words before publishing.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            listing.publication.status === 'published'
              ? 'bg-approved-soft text-approved'
              : publication.canPublish
                ? 'bg-analysis-soft text-analysis'
                : 'bg-gate-soft text-gate'
          }`}
        >
          {listing.publication.status === 'published'
            ? 'Published'
            : publication.canPublish
              ? 'Ready to publish'
              : 'Final checks in progress'}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-2">
          {publication.checks.map((check) => (
            <div key={check.key} className="flex items-center gap-2 rounded-md bg-paper px-3 py-2.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  check.complete || check.optional
                    ? 'bg-approved-soft text-approved'
                    : 'bg-gate-soft text-gate'
                }`}
              >
                {check.complete || check.optional ? '✓' : '·'}
              </span>
              <span className="text-xs text-ink/70">
                {check.label}
                {check.optional && !check.complete ? ' (optional)' : ''}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <input
            value={copy.headline || ''}
            onChange={(event) => setCopy((current) => ({ ...current, headline: event.target.value }))}
            placeholder="Listing headline"
            className="w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
          />
          <textarea
            value={copy.description || ''}
            onChange={(event) => setCopy((current) => ({ ...current, description: event.target.value }))}
            placeholder="Generate listing preparation from the recommended actions first."
            rows={7}
            className="w-full resize-y rounded-md border border-hairline bg-paper px-3 py-2 text-sm leading-relaxed"
          />
          {copy.highlights?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {copy.highlights.map((highlight) => (
                <span key={highlight} className="rounded-full bg-analysis-soft px-2.5 py-1 text-[11px] text-analysis">
                  {highlight}
                </span>
              ))}
            </div>
          )}
          {copy.factsToConfirm?.length > 0 && (
            <div className="rounded-md bg-gate-soft px-3 py-2 text-xs text-gate">
              Confirm before publishing: {copy.factsToConfirm.join(' · ')}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !copy.headline || !copy.description}
              onClick={() => void save(true)}
              className="rounded-sm bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-40"
            >
              Approve copy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(false)}
              className="rounded-sm border border-hairline px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={busy || !publication.canPublish || listing.publication.status === 'published'}
              onClick={() => void publish()}
              className="rounded-sm bg-approved px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Publish property
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onExport()}
              className="rounded-sm border border-hairline px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
              Export package
            </button>
          </div>
          {message && <p className="text-xs text-ink/55">{message}</p>}
        </div>
      </div>
    </section>
  );
}
