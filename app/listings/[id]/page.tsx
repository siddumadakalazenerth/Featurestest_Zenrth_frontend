'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { GuidanceAction, ListingDetail } from '@/lib/types';
import { Header } from '@/components/Header';
import { UploadDropzone } from '@/components/UploadDropzone';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { GuidedActions } from '@/components/GuidedActions';
import { FinalReviewPanel } from '@/components/FinalReviewPanel';
import type { Listing } from '@/lib/types';

const READINESS_PILL: Record<string, { label: string; className: string }> = {
  incomplete:     { label: 'Incomplete',     className: 'bg-gate-soft text-gate' },
  needs_attention:{ label: 'Needs attention',className: 'bg-gate-soft text-gate' },
  nearly_ready:   { label: 'Nearly ready',   className: 'bg-analysis-soft text-analysis' },
  ready:          { label: 'Ready',           className: 'bg-approved-soft text-approved' },
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFinalReview, setShowFinalReview] = useState(false);

  async function refresh() {
    try {
      const data = await api.getListing(params.id);
      setDetail(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listing');
    }
  }

  useEffect(() => { refresh(); }, [params.id]);

  useEffect(() => {
    if (!detail?.photos.some((p) => p.status === 'pending')) return;
    const t = window.setInterval(async () => {
      try { const d = await api.getListing(params.id); setDetail(d); } catch {}
    }, 2000);
    return () => window.clearInterval(t);
  }, [detail?.photos, params.id]);

  useEffect(() => {
    if (!detail?.toolJobs.some((j) => ['queued', 'processing'].includes(j.status))) return;
    const t = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(t);
  }, [detail?.toolJobs, params.id]);

  async function handleUpload(files: File[]) { await api.uploadPhotos(params.id, files); await refresh(); }
  async function handleReplace(photoId: string, file: File) { await api.replacePhoto(params.id, photoId, file); await refresh(); }
  async function handleReanalyze(photoId: string) { await api.reanalyzePhoto(photoId); await refresh(); }
  async function handleDeletePhoto(photoId: string) { await api.deletePhoto(photoId); await refresh(); }

  async function handleSetRoomSubtype(photoId: string, roomSubtype: string | null) {
    await api.setRoomSubtype(params.id, photoId, roomSubtype);
    await refresh();
  }


  async function handleDeleteListing() {
    if (!confirm('Delete this listing and all its photos?')) return;
    await api.deleteListing(params.id);
    router.push('/');
  }

  async function handleGuidedAction(action: GuidanceAction) {
    const result = await api.executeAction(params.id, action.actionId);
    if (result.type === 'upload') {
      window.dispatchEvent(new CustomEvent('zenrth:upload-request', {
        detail: { roomType: result.roomType, photoId: result.photoId },
      }));
      return;
    }
    if (result.type === 'furnishing_suggestion') {
      await refresh();
      window.dispatchEvent(new CustomEvent('zenrth:focus-photo', { detail: { photoId: result.photoId } }));
      return;
    }
    if (result.type === 'dimensions_input') {
      await refresh();
      window.dispatchEvent(new CustomEvent('zenrth:focus-photo', { detail: { photoId: result.photoId } }));
      return;
    }
    await refresh();
  }

  async function handleExecuteAllActions() {
    await api.executeAllActions(params.id);
    await refresh();
  }

  async function handleCustomEdit(photoId: string, prompt: string) {
    await api.customEditPhoto(params.id, photoId, prompt);
    await refresh();
  }

  async function handleProvideFurnishingDimensions(photoId: string, widthMeters: number, lengthMeters: number) {
    await api.provideFurnishingDimensions(params.id, photoId, widthMeters, lengthMeters);
    await refresh();
  }

  async function handleReviewJob(jobId: string, decision: 'accept' | 'reject') {
    await api.reviewToolJob(params.id, jobId, decision); await refresh();
  }
  async function handleRetryJob(jobId: string) {
    await api.retryToolJob(params.id, jobId); await refresh();
  }
  async function handleSaveCopy(copy: Listing['listingCopy']) {
    await api.updateListingCopy(params.id, copy); await refresh();
  }
  async function handlePublish() { await api.publishListing(params.id); await refresh(); }

  async function updateGallery(photoIds: string[], coverPhotoId: string) {
    await api.updateGallery(params.id, photoIds, coverPhotoId); await refresh();
  }
  async function handleSetCover(photoId: string) {
    await updateGallery(photos.map((p) => p._id), photoId);
  }
  async function handleMove(photoId: string, direction: -1 | 1) {
    const order = photos.map((p) => p._id);
    const i = order.indexOf(photoId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    await updateGallery(order, photos.find((p) => p.isCover)?._id || order[0]);
  }
  async function handleRestoreOriginal(photoId: string) {
    const versions = await api.listVersions(photoId);
    const original = versions.find((v) => v.kind === 'original');
    if (!original) throw new Error('Original not available.');
    await api.restoreVersion(photoId, original._id);
    await refresh();
  }
  async function handleReviewFurnishingSuggestion(photoId: string, decision: 'accept' | 'dismiss') {
    await api.reviewFurnishingSuggestion(params.id, photoId, decision); await refresh();
  }

  async function handleVerifyCustomFurnishing(photoId: string, customRequest: string): Promise<{ fits: boolean; message: string }> {
    const result = await api.verifyCustomFurnishing(params.id, photoId, customRequest);
    if (result.fits) await refresh();
    return result;
  }

  if (error) {
    return (
      <div><Header />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <div className="rounded-xl border border-skip/30 bg-skip-soft text-skip text-sm px-4 py-3 mb-4">{error}</div>
          <Link href="/" className="text-sm text-analysis hover:underline">← Back to listings</Link>
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div><Header />
        <main className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 text-ink/40">
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        </main>
      </div>
    );
  }

  const { listing, photos, missingRoomTypes, guidance, toolJobs, publication } = detail;
  const pill = READINESS_PILL[guidance.readiness] ?? READINESS_PILL.incomplete;
  const hasPendingPhotos = photos.some((p) => p.status === 'pending');
  const canUploadMore = photos.length < 5;

  return (
    <div className="min-h-screen bg-paper">
      <Header />

      {/* Sticky title bar */}
      <div className="sticky top-0 z-20 border-b border-hairline bg-paper/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-ink/40 hover:text-ink transition-colors text-lg leading-none">←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-base truncate">{listing.title}</h1>
            {listing.address && <p className="text-xs text-ink/45 truncate">{listing.address}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${pill.className}`}>
            {pill.label}
          </span>
          <button onClick={handleDeleteListing} className="shrink-0 text-xs text-ink/30 hover:text-skip transition-colors">
            Delete
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Pending analysis banner */}
        {hasPendingPhotos && (
          <div className="flex items-center gap-3 rounded-xl bg-analysis-soft px-4 py-3">
            <div className="h-4 w-4 rounded-full border-2 border-analysis border-t-transparent animate-spin shrink-0" />
            <p className="text-sm text-analysis font-medium">Analyzing photos…</p>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <PhotoCarousel
            photos={photos}
            onReanalyze={handleReanalyze}
            onDelete={handleDeletePhoto}
            onSetCover={handleSetCover}
            onMove={handleMove}
            onRestoreOriginal={handleRestoreOriginal}
            onReviewFurnishingSuggestion={handleReviewFurnishingSuggestion}
            onCustomEdit={handleCustomEdit}
            onProvideFurnishingDimensions={handleProvideFurnishingDimensions}
            onVerifyCustomFurnishing={handleVerifyCustomFurnishing}
            onSetRoomSubtype={handleSetRoomSubtype}
          />
        )}

        {/* Upload */}
        <div id="property-upload">
          <UploadDropzone
            onUpload={handleUpload}
            onReplace={handleReplace}
            existingPhotoCount={photos.length}
            existingBytes={photos.reduce((s, p) => s + p.sizeBytes, 0)}
          />
        </div>

        {/* Missing rooms */}
        {missingRoomTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-ink/50">Missing:</span>
            {missingRoomTypes.map((room) => (
              <span key={room} className="rounded-full bg-gate-soft text-gate text-xs font-medium px-2.5 py-1">
                {room}
              </span>
            ))}
          </div>
        )}

        {/* Guided actions */}
        <GuidedActions
          guidance={guidance}
          toolJobs={toolJobs}
          onExecute={handleGuidedAction}
          onExecuteAll={handleExecuteAllActions}
          onReviewJob={handleReviewJob}
          onRetryJob={handleRetryJob}
        />

        {/* Final review — toggled */}
        <div>
          <button
            onClick={() => setShowFinalReview((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-hairline bg-surface px-5 py-4 text-left transition-colors hover:border-analysis/40"
          >
            <div>
              <p className="font-display font-semibold text-sm">Final review &amp; publish</p>
              <p className="text-xs text-ink/45 mt-0.5">
                {listing.publication.status === 'published'
                  ? 'This property is published.'
                  : publication.canPublish
                    ? 'Ready to publish — review and confirm.'
                    : `${publication.checks.filter((c) => !c.complete && !c.optional).length} check(s) remaining`}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${
              listing.publication.status === 'published'
                ? 'bg-approved-soft text-approved'
                : publication.canPublish
                  ? 'bg-analysis-soft text-analysis'
                  : 'bg-gate-soft text-gate'
            }`}>
              {listing.publication.status === 'published' ? 'Published' : publication.canPublish ? 'Ready' : 'In progress'}
            </span>
          </button>

          {showFinalReview && (
            <div className="mt-2">
              <FinalReviewPanel
                listing={listing}
                publication={publication}
                onSaveCopy={handleSaveCopy}
                onPublish={handlePublish}
                onExport={() => api.exportListing(params.id)}
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
