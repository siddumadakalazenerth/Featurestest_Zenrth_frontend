import type { WorkspaceActivity } from '@/lib/types';

export function WorkspaceStatus({ activity }: { activity: WorkspaceActivity }) {
  const percentage = activity.usage.limit
    ? Math.min(100, Math.round((activity.usage.units / activity.usage.limit) * 100))
    : 0;
  return (
    <div className="mb-7 grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-hairline bg-surface p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Monthly AI usage</span>
          <span className="font-mono text-ink/45">
            {activity.usage.units}/{activity.usage.limit}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline">
          <div className="h-full bg-analysis" style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <div className="rounded-md border border-hairline bg-surface p-4">
        <p className="text-xs font-semibold">
          {activity.notifications.length
            ? `${activity.notifications.length} recent notifications`
            : 'Recent workspace activity'}
        </p>
        <p className="mt-2 text-xs text-ink/50">
          {activity.notifications[0]?.message ||
          (activity.events[0]
            ? activity.events[0].action.replaceAll('.', ' ')
            : 'No workspace actions recorded yet.')}
        </p>
      </div>
    </div>
  );
}
