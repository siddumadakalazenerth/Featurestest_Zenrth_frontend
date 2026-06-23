'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Photo } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { QualityGauge } from './QualityGauge';

interface PhotoCardProps {
  photo: Photo;
  qualityThreshold: number;
  onReanalyze: (photoId: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
}

const GATE_COPY: Record<Photo['enhancementGate'], { label: string; className: string }> = {
  pending: { label: 'Awaiting analysis', className: 'text-ink/40' },
  approved: { label: 'Approved for enhancement', className: 'text-approved' },
  skipped: { label: 'Skipped — below quality gate', className: 'text-skip' },
};

export function PhotoCard({ photo, qualityThreshold, onReanalyze, onDelete }: PhotoCardProps) {
  const [busy, setBusy] = useState(false);
  const gate = GATE_COPY[photo.enhancementGate];

  async function handleReanalyze() {
    setBusy(true);
    try {
      await onReanalyze(photo._id);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(photo._id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-hairline bg-surface overflow-hidden flex flex-col">
      <div className="relative w-full aspect-[4/3] bg-hairline/40">
        <Image
          src={resolvePhotoUrl(photo.url)}
          alt={photo.originalName}
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute top-2 left-2">
          <StatusBadge status={photo.status} />
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="font-mono text-[11px] text-ink/40 truncate" title={photo.originalName}>
          {photo.originalName}
        </p>

        {photo.status === 'analyzed' && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{photo.analysis.roomType ?? 'Unclassified'}</span>
              <QualityGauge score={photo.analysis.qualityScore} threshold={qualityThreshold} />
            </div>
            <p className={`text-xs font-medium ${gate.className}`}>{gate.label}</p>
            {photo.analysis.issues.length > 0 && (
              <p className="text-xs text-ink/50 leading-snug">{photo.analysis.issues.join(' · ')}</p>
            )}
            {photo.analysis.reasoning && (
              <p className="text-xs text-ink/40 italic leading-snug">“{photo.analysis.reasoning}”</p>
            )}
          </>
        )}

        {photo.status === 'failed' && (
          <p className="text-xs text-skip leading-snug">{photo.errorMessage || 'Analysis failed.'}</p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-2">
          <button
            onClick={handleReanalyze}
            disabled={busy}
            className="text-xs font-medium text-analysis hover:underline disabled:opacity-40"
          >
            {busy ? 'Working…' : 'Re-run analysis'}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="text-xs font-medium text-ink/40 hover:text-skip hover:underline disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
