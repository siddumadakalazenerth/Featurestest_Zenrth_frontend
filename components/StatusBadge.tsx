import type { PhotoStatus } from '@/lib/types';

const STYLES: Record<PhotoStatus, { label: string; className: string }> = {
  pending: { label: 'Analyzing…', className: 'bg-gate-soft text-gate' },
  analyzed: { label: 'Analyzed', className: 'bg-analysis-soft text-analysis' },
  failed: { label: 'Analysis failed', className: 'bg-skip-soft text-skip' },
};

export function StatusBadge({ status }: { status: PhotoStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
