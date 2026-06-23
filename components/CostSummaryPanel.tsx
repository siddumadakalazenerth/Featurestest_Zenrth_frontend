import type { CostSummary } from '@/lib/types';

function formatInr(n: number): string {
  return `₹${n.toFixed(2)}`;
}

export function CostSummaryPanel({ cost }: { cost: CostSummary }) {
  const rows = [
    { label: 'Baseline — enhance every photo', value: cost.baselineEnhancementCostInr },
    { label: 'Gemini analysis pass', value: cost.analysisCostInr },
    { label: 'With analysis-first filter', value: cost.filteredEnhancementCostInr, emphasis: true },
  ];

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <p className="font-display text-sm font-medium">Cost so far</p>
      <p className="text-xs text-ink/50 mt-1">
        {cost.analyzedPhotos} of {cost.totalPhotos} photos analyzed · gate at {cost.qualityThreshold}/10
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between">
            <span className={`text-sm ${row.emphasis ? 'text-ink' : 'text-ink/60'}`}>{row.label}</span>
            <span className={`font-mono text-sm tabular-nums ${row.emphasis ? 'font-semibold' : ''}`}>
              {formatInr(row.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-hairline flex items-baseline justify-between">
        <span className="text-sm font-medium">Estimated reduction</span>
        <span className="font-mono text-lg font-semibold text-approved tabular-nums">
          {cost.estimatedReductionPct.toFixed(0)}%
        </span>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-ink/50">
        <span>
          <span className="font-medium text-approved">{cost.approvedForEnhancement}</span> approved
        </span>
        <span>
          <span className="font-medium text-skip">{cost.skippedByQualityGate}</span> skipped by gate
        </span>
      </div>
    </div>
  );
}
