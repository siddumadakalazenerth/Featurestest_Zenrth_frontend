'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

const ROOM_SUBTYPES = [
  'Master Bedroom',
  'Guest Bedroom',
  'Children\'s Bedroom',
  'Home Office',
  'Commercial / Meeting Room',
  'Storage Room',
];

interface PhotoCarouselProps {
  photos: Photo[];
  onReanalyze: (photoId: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onSetCover: (photoId: string) => Promise<void>;
  onMove: (photoId: string, direction: -1 | 1) => Promise<void>;
  onRestoreOriginal: (photoId: string) => Promise<void>;
  onReviewFurnishingSuggestion: (photoId: string, decision: 'accept' | 'dismiss') => Promise<void>;
  onCustomEdit: (photoId: string, prompt: string) => Promise<void>;
  onProvideFurnishingDimensions: (photoId: string, widthMeters: number, lengthMeters: number) => Promise<void>;
  onVerifyCustomFurnishing: (photoId: string, customRequest: string) => Promise<{ fits: boolean; message: string }>;
  onSetRoomSubtype: (photoId: string, roomSubtype: string | null) => Promise<void>;
}

const STATUS_DOT: Record<string, string> = {
  pending:  'bg-ink/25',
  analyzed: 'bg-approved',
  failed:   'bg-skip',
};

function getEditSuggestions(photo: Photo): string[] {
  const suggestions: string[] = [];
  const issues = photo.analysis?.issues ?? [];
  const room = (photo.analysis?.roomType ?? '').toLowerCase();

  if (issues.some((i) => /obstruct|foreground/i.test(i))) suggestions.push('Remove the foreground obstruction');
  if (issues.some((i) => /dark|under.?expos|dim|low.?light/i.test(i))) suggestions.push('Brighten the room and improve lighting');
  if (issues.some((i) => /over.?expos|blown|too.?bright/i.test(i))) suggestions.push('Reduce exposure and recover blown highlights');
  if (issues.some((i) => /clutter|messy|untidy/i.test(i))) suggestions.push('Remove visible clutter from the room');
  if (issues.some((i) => /shadow|harsh/i.test(i))) suggestions.push('Soften harsh shadows');
  if (issues.some((i) => /color|white.?balance|tint/i.test(i))) suggestions.push('Correct the color balance');

  if (suggestions.length < 2) {
    if (room.includes('bedroom')) {
      suggestions.push('Straighten and smooth the bedding', 'Improve the lighting warmth');
    } else if (room.includes('kitchen')) {
      suggestions.push('Clear the countertops', 'Brighten the kitchen');
    } else if (room.includes('bathroom')) {
      suggestions.push('Remove personal items from the countertop', 'Improve lighting');
    } else if (room.includes('living')) {
      suggestions.push('Tidy the seating area', 'Improve natural lighting');
    } else if (room.includes('exterior')) {
      suggestions.push('Remove cars or obstructions from the driveway', 'Brighten the sky');
    } else if (room.includes('dining')) {
      suggestions.push('Clear and tidy the dining table');
    }
  }

  return [...new Set(suggestions)].slice(0, 4);
}

export function PhotoCarousel({
  photos, onReanalyze, onDelete, onSetCover, onMove, onRestoreOriginal,
  onReviewFurnishingSuggestion, onCustomEdit, onProvideFurnishingDimensions, onVerifyCustomFurnishing,
  onSetRoomSubtype,
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [dims, setDims] = useState({ width: '', length: '' });
  const [customFurnRequest, setCustomFurnRequest] = useState('');
  const [customFurnResult, setCustomFurnResult] = useState<{ fits: boolean; message: string } | null>(null);
  const [verifyingFurn, setVerifyingFurn] = useState(false);

  useEffect(() => {
    if (index >= photos.length) setIndex(Math.max(0, photos.length - 1));
  }, [index, photos.length]);

  useEffect(() => {
    function handler(e: Event) {
      const id = (e as CustomEvent<{ photoId?: string | null }>).detail?.photoId;
      if (!id) return;
      const i = photos.findIndex((p) => p._id === id);
      if (i >= 0) setIndex(i);
    }
    window.addEventListener('zenrth:focus-photo', handler);
    return () => window.removeEventListener('zenrth:focus-photo', handler);
  }, [photos]);

  const photo = photos[index];

  useEffect(() => {
    setCustomFurnRequest('');
    setCustomFurnResult(null);
  }, [photo?._id]);

  if (!photo) return null;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  function move(dir: number) {
    setIndex((i) => (i + dir + photos.length) % photos.length);
  }

  const isReady = photo.status === 'analyzed' && photo.enhancementGate === 'approved';
  const hasSuggestion = !!photo.furnishingSuggestion?.generatedAt;
  const editSuggestions = photo.status === 'analyzed' ? getEditSuggestions(photo) : [];
  const isEmptyRoom = photo.analysis?.emptyRoom && photo.status === 'analyzed';
  const needsSubtype = isEmptyRoom && !photo.roomSubtype && !hasSuggestion;

  function openEditor() {
    setEditPrompt('');
    setEditError(null);
    setEditing(true);
  }

  async function submitEdit() {
    if (!editPrompt.trim()) {
      setEditError('Describe the change you want first.');
      return;
    }
    setBusy(true);
    setEditError(null);
    try {
      await onCustomEdit(photo._id, editPrompt.trim());
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not start the edit.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCustomFurniture() {
    if (!customFurnRequest.trim()) return;
    setVerifyingFurn(true);
    setCustomFurnResult(null);
    try {
      const result = await onVerifyCustomFurnishing(photo._id, customFurnRequest.trim());
      if (!result.fits) {
        setCustomFurnResult(result);
      }
    } catch (e) {
      setCustomFurnResult({ fits: false, message: e instanceof Error ? e.message : 'Could not verify.' });
    } finally {
      setVerifyingFurn(false);
    }
  }

  const furn = photo.furnishingSuggestion;

  return (
    <div className="rounded-xl border border-hairline bg-surface overflow-hidden">

      {/* Main image */}
      <div className="relative group">
        <button
          type="button"
          onClick={openEditor}
          disabled={photo.status === 'pending'}
          className="relative block w-full aspect-[16/9] disabled:cursor-default"
          aria-label="Edit this photo with AI"
        >
          <Image
            src={resolvePhotoUrl(photo.url)}
            alt={photo.originalName}
            fill
            priority={index === 0}
            unoptimized
            className="object-cover"
          />
          {photo.status !== 'pending' && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-colors">
              <span className="opacity-0 group-hover:opacity-100 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-ink shadow-sm transition-opacity">
                ✎ Edit this photo
              </span>
            </span>
          )}
        </button>

        {/* Status + cover badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          {photo.status === 'pending' && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full border border-white/60 border-t-transparent animate-spin" />
              Analyzing
            </span>
          )}
          {photo.status === 'analyzed' && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
              isReady ? 'bg-approved/90 text-white' : 'bg-gate/90 text-white'
            }`}>
              {isReady ? 'Ready to use' : 'Improvement suggested'}
            </span>
          )}
          {photo.status === 'failed' && (
            <span className="rounded-full bg-skip/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Analysis failed
            </span>
          )}
          {photo.isCover && (
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              ★ Cover
            </span>
          )}
        </div>

        {/* Navigation */}
        {photos.length > 1 && (
          <>
            <button onClick={() => move(-1)} aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 text-white text-xl flex items-center justify-center hover:bg-black/75 transition-colors">
              ‹
            </button>
            <button onClick={() => move(1)} aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 text-white text-xl flex items-center justify-center hover:bg-black/75 transition-colors">
              ›
            </button>
          </>
        )}

        <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">
          {index + 1} / {photos.length}
        </span>
      </div>

      {/* Info bar */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display font-semibold text-base">
              {photo.roomSubtype
                ? `${photo.roomSubtype} · ${photo.analysis?.roomType || ''}`
                : photo.analysis?.roomType || (photo.status === 'pending' ? 'In queue…' : 'Unclassified')}
            </p>
            {photo.analysis?.qualityScore != null && (
              <p className="text-xs text-ink/45 mt-0.5">Quality score {photo.analysis.qualityScore}/10</p>
            )}
          </div>
          {photo.analysis?.issues && photo.analysis.issues.length > 0 && (
            <p className="text-xs text-gate bg-gate-soft rounded-full px-3 py-1 shrink-0">
              {photo.analysis.issues[0]}{photo.analysis.issues.length > 1 ? ` +${photo.analysis.issues.length - 1}` : ''}
            </p>
          )}
        </div>

        {photo.analysis?.reasoning && (
          <p className="text-xs text-ink/50 italic leading-relaxed">"{photo.analysis.reasoning}"</p>
        )}

        {photo.status === 'failed' && (
          <p className="rounded-lg bg-skip-soft px-3 py-2 text-xs text-skip">{photo.errorMessage || 'Analysis failed.'}</p>
        )}

        {/* Room subtype picker for empty rooms */}
        {needsSubtype && (
          <div className="rounded-lg border border-gate/25 bg-gate-soft px-4 py-3">
            <p className="text-xs font-semibold text-gate mb-1">Empty room detected</p>
            <p className="text-xs text-ink/60 mb-2.5">
              What will this room be used for? This helps us suggest the right furniture, lighting, and style.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_SUBTYPES.map((subtype) => (
                <button
                  key={subtype}
                  disabled={busy}
                  onClick={() => void run(() => onSetRoomSubtype(photo._id, subtype))}
                  className="rounded-full border border-gate/40 bg-white/70 px-3 py-1 text-xs font-medium text-ink/70 hover:border-gate hover:text-ink transition-colors disabled:opacity-40"
                >
                  {subtype}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Room subtype already set — show change option */}
        {isEmptyRoom && photo.roomSubtype && !hasSuggestion && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/50">Room type set to <strong>{photo.roomSubtype}</strong></span>
            <button
              disabled={busy}
              onClick={() => void run(() => onSetRoomSubtype(photo._id, null))}
              className="text-xs text-gate hover:underline disabled:opacity-40"
            >
              Change
            </button>
          </div>
        )}

        {/* Furnishing suggestion */}
        {hasSuggestion && furn && (
          <div className="rounded-lg border border-gate/25 bg-gate-soft px-4 py-3 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gate">
                  {furn.style ? `${furn.style} · ` : ''}
                  {furn.roomSubtype || furn.roomType || 'Room'} staging plan
                </p>
                {furn.lightingMood && (
                  <p className="text-[11px] text-ink/50 mt-0.5">{furn.lightingMood}</p>
                )}
              </div>
              {furn.status !== 'suggested' && (
                <span className="text-[11px] font-semibold text-gate/70 capitalize">{furn.status}</span>
              )}
            </div>

            {/* Color palette */}
            {furn.colorPalette && furn.colorPalette.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wide mb-1">Color palette</p>
                <div className="flex flex-wrap gap-1.5">
                  {furn.colorPalette.map((color, i) => (
                    <span key={i} className="rounded-full border border-gate/20 bg-white/60 px-2.5 py-0.5 text-xs text-ink/65">{color}</span>
                  ))}
                </div>
              </div>
            )}

            {furn.summary && (
              <p className="text-xs text-ink/65 leading-relaxed">{furn.summary}</p>
            )}

            {/* Furniture */}
            {furn.pieces.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wide mb-1.5">Furniture</p>
                <ul className="space-y-1.5">
                  {furn.pieces.map((piece, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-gate mt-0.5 shrink-0">·</span>
                      <span className="text-ink/70"><strong>{piece.item}</strong>{piece.placement ? ` — ${piece.placement}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lighting */}
            {furn.lighting && furn.lighting.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wide mb-1.5">Lighting</p>
                <ul className="space-y-1.5">
                  {furn.lighting.map((light, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-analysis mt-0.5 shrink-0">◎</span>
                      <span className="text-ink/70"><strong>{light.item}</strong>{light.placement ? ` — ${light.placement}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Window treatments */}
            {furn.windowTreatments?.type && (
              <div>
                <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wide mb-1">Window treatments</p>
                <p className="text-xs text-ink/70">
                  <strong>{furn.windowTreatments.type}</strong>
                  {furn.windowTreatments.color ? ` in ${furn.windowTreatments.color}` : ''}
                  {furn.windowTreatments.notes ? ` — ${furn.windowTreatments.notes}` : ''}
                </p>
              </div>
            )}

            {/* Low-confidence dimension input */}
            {furn.status === 'suggested' && (furn.estimatedDimensions?.confidence ?? 1) < 0.4 && (
              <div className="rounded-lg bg-white/70 px-3 py-2.5">
                <p className="text-xs text-ink/60 mb-2">We couldn't tell this room's size confidently — enter it for accurately-sized furniture:</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.1" placeholder="Width (m)" value={dims.width}
                    onChange={(e) => setDims((d) => ({ ...d, width: e.target.value }))}
                    className="w-24 rounded-md border border-hairline px-2 py-1.5 text-xs focus:outline-none focus:border-analysis/50" />
                  <span className="text-ink/30 text-xs">×</span>
                  <input type="number" min="0" step="0.1" placeholder="Length (m)" value={dims.length}
                    onChange={(e) => setDims((d) => ({ ...d, length: e.target.value }))}
                    className="w-24 rounded-md border border-hairline px-2 py-1.5 text-xs focus:outline-none focus:border-analysis/50" />
                  <button disabled={busy || !dims.width || !dims.length}
                    onClick={() => void run(() => onProvideFurnishingDimensions(photo._id, Number(dims.width), Number(dims.length)))}
                    className="ml-auto rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-40">
                    Use this size
                  </button>
                </div>
              </div>
            )}

            {/* Accept / Dismiss buttons */}
            {furn.status === 'suggested' && (
              <div className="flex gap-2">
                <button disabled={busy}
                  onClick={() => void run(() => onReviewFurnishingSuggestion(photo._id, 'accept'))}
                  className="flex-1 rounded-lg bg-approved py-2 text-xs font-semibold text-white disabled:opacity-40 transition-colors hover:bg-approved/90">
                  Accept — generate staged image
                </button>
                <button disabled={busy}
                  onClick={() => void run(() => onReviewFurnishingSuggestion(photo._id, 'dismiss'))}
                  className="flex-1 rounded-lg border border-hairline bg-white py-2 text-xs font-semibold disabled:opacity-40 transition-colors">
                  Dismiss
                </button>
              </div>
            )}

            {/* Custom furniture request after dismiss */}
            {furn.status === 'dismissed' && (
              <div className="border-t border-gate/20 pt-3">
                <p className="text-xs font-medium text-ink/60 mb-2">Prefer something different? Describe what you'd like:</p>
                <textarea
                  value={customFurnRequest}
                  onChange={(e) => { setCustomFurnRequest(e.target.value); setCustomFurnResult(null); }}
                  placeholder="e.g. A king bed, two bedside tables, and a wardrobe on the far wall"
                  rows={2}
                  className="w-full rounded-lg border border-hairline px-3 py-2 text-xs focus:outline-none focus:border-analysis/50 resize-none"
                />
                {customFurnResult && (
                  <div className={`mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    customFurnResult.fits ? 'bg-approved-soft text-approved' : 'bg-skip-soft text-skip'
                  }`}>
                    {customFurnResult.fits ? '✓ ' : '✗ '}{customFurnResult.message}
                  </div>
                )}
                <button
                  disabled={verifyingFurn || busy || !customFurnRequest.trim()}
                  onClick={() => void verifyCustomFurniture()}
                  className="mt-2 w-full rounded-lg bg-ink py-2 text-xs font-semibold text-paper disabled:opacity-40 transition-colors hover:bg-ink/85"
                >
                  {verifyingFurn ? 'Checking if it fits…' : 'Check if it fits'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick actions row */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {!photo.isCover && (
            <button disabled={busy} onClick={() => void run(() => onSetCover(photo._id))}
              className="text-xs font-medium text-analysis hover:underline disabled:opacity-40">
              Set as cover
            </button>
          )}
          <button disabled={busy || index === 0} onClick={() => void run(() => onMove(photo._id, -1))}
            className="text-xs font-medium text-ink/40 hover:text-ink hover:underline disabled:opacity-30">
            ← Move earlier
          </button>
          <button disabled={busy || index === photos.length - 1} onClick={() => void run(() => onMove(photo._id, 1))}
            className="text-xs font-medium text-ink/40 hover:text-ink hover:underline disabled:opacity-30">
            Move later →
          </button>
          {photo.url.includes('/generated/') && (
            <button disabled={busy} onClick={() => void run(() => onRestoreOriginal(photo._id))}
              className="text-xs font-medium text-gate hover:underline disabled:opacity-40">
              Restore original
            </button>
          )}
          <button disabled={busy || photo.status === 'pending'} onClick={() => void run(() => onReanalyze(photo._id))}
            className="text-xs font-medium text-ink/40 hover:text-analysis hover:underline disabled:opacity-40">
            Re-analyze
          </button>
          <button disabled={busy} onClick={() => void run(() => onDelete(photo._id))}
            className="ml-auto text-xs font-medium text-ink/30 hover:text-skip hover:underline disabled:opacity-40">
            Remove
          </button>
        </div>
      </div>

      {/* Room-grouped thumbnail strip */}
      {photos.length > 1 && (
        <div className="border-t border-hairline bg-paper/50 px-3 pt-3 pb-2">
          <RoomStrip photos={photos} activeIndex={index} onSelect={setIndex} />
        </div>
      )}

      {/* Edit-with-AI dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => !busy && setEditing(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-semibold text-sm mb-1">What would you like to change?</p>
            <p className="text-xs text-ink/50 mb-3">
              Describe it in plain language — e.g. "change the bedsheet to match the curtain color" or "remove the bin by the door".
              We'll keep the room's structure exactly as it is.
            </p>

            {/* Analysis-based quick suggestions */}
            {editSuggestions.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-ink/40 mb-1.5">Suggested for this photo:</p>
                <div className="flex flex-wrap gap-1.5">
                  {editSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditPrompt(s)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        editPrompt === s
                          ? 'border-analysis bg-analysis-soft text-analysis'
                          : 'border-hairline text-ink/60 hover:border-analysis/50 hover:text-analysis'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              autoFocus
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g. Change the bedsheet color to match the curtains"
              rows={3}
              className="w-full rounded-lg border border-hairline px-3 py-2 text-sm focus:outline-none focus:border-analysis/50 resize-none"
            />
            {editError && <p className="mt-2 text-xs text-skip">{editError}</p>}
            <div className="flex gap-2 mt-4">
              <button disabled={busy} onClick={() => void submitEdit()}
                className="flex-1 rounded-lg bg-ink py-2.5 text-sm font-semibold text-paper hover:bg-ink/85 disabled:opacity-50 transition-colors">
                {busy ? 'Applying…' : 'Apply this change'}
              </button>
              <button disabled={busy} onClick={() => setEditing(false)}
                className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-paper disabled:opacity-40 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ROOM_ORDER = [
  'Living Room', 'Kitchen', 'Bedroom', 'Bathroom',
  'Dining Room', 'Balcony', 'Hallway', 'Garage', 'Exterior', 'Other',
];

function RoomStrip({
  photos,
  activeIndex,
  onSelect,
}: {
  photos: Photo[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const byRoom = new Map<string, { photo: Photo; idx: number }[]>();

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const room = p.status === 'analyzed'
      ? (p.analysis?.roomType || 'Other')
      : p.status === 'pending' ? 'Analyzing…' : 'Failed';
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push({ photo: p, idx: i });
  }

  const entries = [...byRoom.entries()].sort(([a], [b]) => {
    const ai = ROOM_ORDER.indexOf(a);
    const bi = ROOM_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([room, items]) => (
        <div key={room}>
          <p className="text-[10px] font-semibold text-ink/35 uppercase tracking-wide mb-1">
            {room} <span className="font-normal text-ink/25">({items.length})</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {items.map(({ photo, idx }) => {
              const isActive = idx === activeIndex;
              const dot = STATUS_DOT[photo.status] || 'bg-ink/25';
              return (
                <button
                  key={photo._id}
                  onClick={() => onSelect(idx)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    isActive
                      ? 'border-analysis scale-105 shadow-sm'
                      : 'border-transparent opacity-55 hover:opacity-90'
                  }`}
                >
                  <Image
                    src={resolvePhotoUrl(photo.url)}
                    alt={photo.originalName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <span className={`absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white ${dot}`} />
                  {photo.isCover && (
                    <span className="absolute top-0.5 left-1 text-[9px] text-white drop-shadow">★</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
