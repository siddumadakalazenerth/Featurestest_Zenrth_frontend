'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { GuidanceAction, PropertyGuidance, ToolJob } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

interface GuidedActionsProps {
  guidance: PropertyGuidance;
  toolJobs: ToolJob[];
  onExecute: (action: GuidanceAction) => Promise<void>;
  onExecuteAll: () => Promise<void>;
  onReviewJob: (jobId: string, decision: 'accept' | 'reject') => Promise<void>;
  onRetryJob: (jobId: string) => Promise<void>;
}

const BATCH_FIX_TOOLS = new Set(['photo_enhancement', 'defurnishing', 'smart_editing']);

const TOOL_NAMES: Record<string, string> = {
  photo_enhancement: 'Enhance photo',
  defurnishing: 'Remove clutter',
  smart_editing: 'Smart edit',
  multi_image_analysis: 'Review photo set',
  floor_plan_recognition: 'Confirm floor plan',
  virtual_staging: 'Suggest furniture',
  virtual_staging_render: 'Furnish room',
  listing_copy: 'Write listing copy',
  content_moderation: 'Review image',
  custom_edit: 'Custom edit',
};

const STATUS_STYLE: Record<string, string> = {
  queued:           'bg-paper text-ink/50',
  processing:       'bg-analysis-soft text-analysis',
  ready_for_review: 'bg-approved-soft text-approved',
  accepted:         'bg-approved-soft text-approved',
  rejected:         'bg-paper text-ink/40',
  failed:           'bg-skip-soft text-skip',
};

export function GuidedActions({ guidance, toolJobs, onExecute, onExecuteAll, onReviewJob, onRetryJob }: GuidedActionsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const actions = guidance.actions;
  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1);
  const batchFixCount = actions.filter((a) => a.kind === 'tool' && BATCH_FIX_TOOLS.has(a.tool)).length;

  // Jobs needing review shown most prominently
  const reviewableJobs = toolJobs.filter((j) => j.status === 'ready_for_review');
  const activeJobs = toolJobs.filter((j) => ['queued', 'processing'].includes(j.status));
  const recentJobs = toolJobs.filter((j) => ['failed', 'rejected', 'accepted'].includes(j.status)).slice(0, 3);

  async function run(action: GuidanceAction) {
    setBusyId(action.actionId);
    setError(null);
    try { await onExecute(action); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start action.'); }
    finally { setBusyId(null); }
  }

  async function runAll() {
    setBusyAll(true);
    setError(null);
    try { await onExecuteAll(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start the fixes.'); }
    finally { setBusyAll(false); }
  }

  if (!primaryAction && toolJobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">

      {/* Jobs ready for review — highest priority */}
      {reviewableJobs.map((job) => (
        <div key={job._id} className="rounded-xl border-2 border-approved/30 bg-approved-soft overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-approved/70">Result ready</p>
                <h3 className="font-display font-semibold text-base mt-0.5">{TOOL_NAMES[job.tool] ?? job.tool}</h3>
              </div>
              <span className="rounded-full bg-approved px-3 py-1 text-xs font-semibold text-white shrink-0">Review now</span>
            </div>

            {job.resultType === 'image' && job.resultUrl && (
              <div className="rounded-lg overflow-hidden border border-approved/20 mb-4">
                <div className="relative aspect-[16/9]">
                  <Image src={resolvePhotoUrl(job.resultUrl)} alt="Result preview" fill unoptimized className="object-cover" />
                </div>
                <p className="bg-white/60 px-3 py-2 text-[11px] text-ink/50">Original is preserved until you accept</p>
              </div>
            )}

            {job.resultType === 'report' && job.resultData && (
              <div className="rounded-lg bg-white/60 px-4 py-3 mb-4 space-y-2 text-sm text-ink/70 max-h-48 overflow-y-auto">
                {Object.entries(job.resultData as Record<string, unknown>).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">
                      {k.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')}
                    </p>
                    <p className="text-xs leading-relaxed">
                      {Array.isArray(v) ? (v as string[]).join(' · ') : String(v ?? '')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {job.resultType === 'text' && job.resultData && (
              <div className="rounded-lg bg-white/60 px-4 py-3 mb-4 text-sm text-ink/70 max-h-48 overflow-y-auto">
                {Object.entries(job.resultData as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">
                      {k.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="text-xs leading-relaxed">{String(v ?? '')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => void onReviewJob(job._id, 'accept')}
                className="flex-1 rounded-lg bg-approved py-2.5 text-sm font-semibold text-white hover:bg-approved/90 transition-colors"
              >
                ✓ Accept
              </button>
              <button
                onClick={() => void onReviewJob(job._id, 'reject')}
                className="flex-1 rounded-lg border border-hairline bg-white py-2.5 text-sm font-semibold text-ink/70 hover:bg-paper transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Active jobs */}
      {activeJobs.map((job) => (
        <div key={job._id} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-5 py-4">
          <div className="h-4 w-4 rounded-full border-2 border-analysis border-t-transparent animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{TOOL_NAMES[job.tool] ?? job.tool}</p>
            <p className="text-xs text-ink/45 truncate">{job.message}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[job.status]}`}>
            {job.status === 'processing' ? 'Running…' : 'Queued'}
          </span>
        </div>
      ))}

      {/* Apply all suggested fixes — one click instead of approving each photo separately */}
      {batchFixCount > 1 && reviewableJobs.length === 0 && activeJobs.length === 0 && (
        <button
          disabled={busyAll || busyId !== null}
          onClick={() => void runAll()}
          className="flex items-center justify-between rounded-xl border border-analysis/30 bg-analysis-soft px-5 py-3.5 text-left transition-colors hover:border-analysis/50 disabled:opacity-60"
        >
          <span>
            <span className="block font-display font-semibold text-sm text-analysis">Apply all {batchFixCount} suggested fixes</span>
            <span className="block text-xs text-analysis/70 mt-0.5">Review each result afterwards — nothing changes until you accept it</span>
          </span>
          {busyAll
            ? <span className="h-4 w-4 rounded-full border-2 border-analysis border-t-transparent animate-spin shrink-0" />
            : <span className="shrink-0 rounded-lg bg-analysis px-3 py-1.5 text-xs font-semibold text-white">Apply all</span>}
        </button>
      )}

      {/* Primary next action */}
      {primaryAction && reviewableJobs.length === 0 && activeJobs.length === 0 && (
        <div className="rounded-xl border border-hairline bg-surface overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-1">Next step</p>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-base">{primaryAction.title}</h3>
                {(primaryAction.qualityScore != null || primaryAction.primaryIssue) && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {primaryAction.qualityScore != null && (
                      <span className="text-xs font-medium text-ink/50">
                        Quality score {primaryAction.qualityScore}/10
                      </span>
                    )}
                    {primaryAction.primaryIssue && (
                      <span className="rounded-full bg-skip-soft px-2 py-0.5 text-[11px] font-semibold text-skip capitalize">
                        {primaryAction.primaryIssue}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-ink/55 mt-1.5 leading-relaxed">
                  {primaryAction.tool === 'smart_editing' && primaryAction.message
                    ? <span>&ldquo;{primaryAction.message}&rdquo;</span>
                    : primaryAction.message}
                </p>
              </div>
              <button
                disabled={busyId !== null}
                onClick={() => void run(primaryAction)}
                className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-ink/85 disabled:opacity-50 transition-colors"
              >
                {busyId === primaryAction.actionId
                  ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border-2 border-paper border-t-transparent animate-spin" />Starting…</span>
                  : primaryAction.ctaLabel}
              </button>
            </div>
          </div>

          {/* Secondary actions — collapsed */}
          {secondaryActions.length > 0 && (
            <div className="border-t border-hairline">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full px-5 py-3 text-xs font-medium text-ink/45 hover:text-ink hover:bg-paper/50 transition-colors text-left flex items-center justify-between"
              >
                <span>{showAll ? 'Hide' : `${secondaryActions.length} more suggestion${secondaryActions.length > 1 ? 's' : ''}`}</span>
                <span>{showAll ? '↑' : '↓'}</span>
              </button>
              {showAll && (
                <div className="divide-y divide-hairline">
                  {secondaryActions.map((action) => (
                    <div key={action.actionId} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{action.title}</p>
                        <p className="text-xs text-ink/45 truncate">{action.message}</p>
                      </div>
                      <button
                        disabled={busyId !== null}
                        onClick={() => void run(action)}
                        className="shrink-0 rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold hover:border-analysis/50 hover:text-analysis disabled:opacity-40 transition-colors"
                      >
                        {busyId === action.actionId ? '…' : action.ctaLabel}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recently completed */}
      {recentJobs.length > 0 && (
        <div className="space-y-1.5">
          {recentJobs.map((job) => (
            <div key={job._id} className="rounded-lg bg-paper px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  job.status === 'accepted' ? 'bg-approved' : job.status === 'failed' ? 'bg-skip' : 'bg-ink/25'
                }`} />
                <p className="flex-1 text-xs text-ink/55">
                  {TOOL_NAMES[job.tool] ?? job.tool}
                  {job.status === 'accepted' ? ' · accepted' : job.status === 'rejected' ? ' · rejected' : ' · failed'}
                </p>
                {(job.status === 'failed' || job.status === 'rejected') && (
                  <button onClick={() => void onRetryJob(job._id)} className="text-xs font-medium text-analysis hover:underline">
                    Retry
                  </button>
                )}
              </div>
              {job.status === 'failed' && job.errorMessage && (
                <p className="mt-1.5 ml-4 text-[11px] leading-relaxed text-skip/80 break-words">
                  {job.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-skip-soft px-4 py-3 text-sm text-skip">{error}</p>
      )}
    </div>
  );
}
