import Link from 'next/link';
import type { ListingSummary } from '@/lib/types';

const READINESS: Record<string, { dot: string; label: string }> = {
  incomplete:      { dot: 'bg-ink/25',  label: 'Incomplete' },
  needs_attention: { dot: 'bg-gate',    label: 'Needs attention' },
  nearly_ready:    { dot: 'bg-analysis',label: 'Nearly ready' },
  ready:           { dot: 'bg-approved',label: 'Ready' },
};

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const { photoCount, analyzedCount, missingRoomTypes, guidance } = listing;
  const progressPct = photoCount > 0 ? Math.round((analyzedCount / photoCount) * 100) : 0;
  const readiness = READINESS[(guidance as { readiness?: string })?.readiness ?? 'incomplete'] ?? READINESS.incomplete;

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="group block rounded-xl border border-hairline bg-surface p-5 hover:border-analysis/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="font-display font-semibold text-base truncate group-hover:text-analysis transition-colors">
            {listing.title}
          </p>
          {listing.address && <p className="text-sm text-ink/45 mt-0.5 truncate">{listing.address}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-2 w-2 rounded-full ${readiness.dot}`} />
          <span className="text-xs text-ink/50">{readiness.label}</span>
        </div>
      </div>

      {photoCount > 0 ? (
        <>
          <div className="h-1.5 rounded-full bg-hairline overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-approved' : 'bg-analysis'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-ink/40">{analyzedCount}/{photoCount} analyzed</p>
        </>
      ) : (
        <p className="text-xs text-ink/35 italic">No photos yet — tap to add some</p>
      )}

      {missingRoomTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {missingRoomTypes.slice(0, 3).map((room) => (
            <span key={room} className="rounded-full bg-gate-soft text-gate text-[11px] font-medium px-2 py-0.5">
              {room}
            </span>
          ))}
          {missingRoomTypes.length > 3 && (
            <span className="text-[11px] text-ink/35 py-0.5">+{missingRoomTypes.length - 3}</span>
          )}
        </div>
      )}

      {missingRoomTypes.length === 0 && photoCount > 0 && (
        <p className="text-[11px] font-semibold text-approved mt-3">✓ All rooms covered</p>
      )}
    </Link>
  );
}
