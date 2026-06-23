'use client';

import Image from 'next/image';
import type { Photo } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

interface RoomGalleryProps {
  photos: Photo[];
  onSelectPhoto: (photoId: string) => void;
}

const ROOM_ORDER = [
  'Living Room', 'Kitchen', 'Bedroom', 'Bathroom',
  'Dining Room', 'Balcony', 'Hallway', 'Garage', 'Exterior', 'Other',
];

function qualityColor(score: number | null): string {
  if (score == null) return 'text-ink/30';
  if (score >= 7) return 'text-approved';
  if (score >= 5) return 'text-analysis';
  return 'text-gate';
}

export function RoomGallery({ photos, onSelectPhoto }: RoomGalleryProps) {
  const pending = photos.filter((p) => p.status === 'pending');
  const failed = photos.filter((p) => p.status === 'failed');

  // Group analyzed photos by room type
  const byRoom = new Map<string, Photo[]>();
  for (const photo of photos) {
    if (photo.status !== 'analyzed') continue;
    const room = photo.analysis?.roomType || 'Other';
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(photo);
  }

  // Sort room groups by ROOM_ORDER, then alphabetically for unlisted types
  const roomEntries = [...byRoom.entries()].sort(([a], [b]) => {
    const ai = ROOM_ORDER.indexOf(a);
    const bi = ROOM_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  if (roomEntries.length === 0 && pending.length === 0 && failed.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Pending group */}
      {pending.length > 0 && (
        <RoomSection
          title="Analyzing…"
          count={pending.length}
          photos={pending}
          onSelect={onSelectPhoto}
          muted
        />
      )}

      {/* Analyzed rooms */}
      {roomEntries.map(([room, roomPhotos]) => (
        <RoomSection
          key={room}
          title={room}
          count={roomPhotos.length}
          photos={roomPhotos}
          onSelect={onSelectPhoto}
        />
      ))}

      {/* Failed */}
      {failed.length > 0 && (
        <RoomSection
          title="Analysis failed"
          count={failed.length}
          photos={failed}
          onSelect={onSelectPhoto}
          muted
        />
      )}
    </div>
  );
}

function RoomSection({
  title,
  count,
  photos,
  onSelect,
  muted = false,
}: {
  title: string;
  count: number;
  photos: Photo[];
  onSelect: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-semibold ${muted ? 'text-ink/35' : 'text-ink/60'}`}>
          {title}
        </span>
        <span className="rounded-full bg-paper border border-hairline px-2 py-0.5 text-[11px] text-ink/40 font-medium">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <PhotoThumb key={photo._id} photo={photo} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function PhotoThumb({ photo, onSelect }: { photo: Photo; onSelect: (id: string) => void }) {
  const score = photo.analysis?.qualityScore ?? null;
  const isPending = photo.status === 'pending';
  const isFailed = photo.status === 'failed';
  const isReady = photo.status === 'analyzed' && photo.enhancementGate === 'approved';
  const hasIssues = (photo.analysis?.issues?.length ?? 0) > 0;
  const isEmpty = photo.analysis?.emptyRoom;

  return (
    <button
      type="button"
      onClick={() => onSelect(photo._id)}
      className="relative overflow-hidden rounded-lg border border-hairline bg-paper aspect-[4/3] group focus:outline-none focus:ring-2 focus:ring-analysis/40"
    >
      <Image
        src={resolvePhotoUrl(photo.url)}
        alt={photo.originalName}
        fill
        unoptimized
        className={`object-cover transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
      />

      {/* Status overlay */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        </div>
      )}

      {/* Hover overlay */}
      {!isPending && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent">
        {score !== null ? (
          <span className={`text-[10px] font-bold ${qualityColor(score)} drop-shadow`}>
            {score}/10
          </span>
        ) : <span />}
        <div className="flex gap-1">
          {photo.isCover && (
            <span className="text-[9px] text-white/90">★</span>
          )}
          {isEmpty && !photo.furnishingSuggestion?.generatedAt && (
            <span className="rounded bg-gate/80 px-1 text-[9px] text-white font-medium">empty</span>
          )}
          {isReady && (
            <span className="rounded bg-approved/80 px-1 text-[9px] text-white font-medium">✓</span>
          )}
          {isFailed && (
            <span className="rounded bg-skip/80 px-1 text-[9px] text-white font-medium">!</span>
          )}
          {hasIssues && !isFailed && !isReady && (
            <span className="rounded bg-gate/80 px-1 text-[9px] text-white font-medium">fix</span>
          )}
        </div>
      </div>
    </button>
  );
}
