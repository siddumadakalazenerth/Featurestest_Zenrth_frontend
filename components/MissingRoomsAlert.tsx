interface MissingRoomsAlertProps {
  missingRoomTypes: string[];
}

export function MissingRoomsAlert({ missingRoomTypes }: MissingRoomsAlertProps) {
  if (missingRoomTypes.length === 0) {
    return (
      <div className="rounded-md border border-approved/30 bg-approved-soft px-4 py-3 flex items-center gap-3">
        <span className="text-approved text-sm font-medium">Checklist complete</span>
        <span className="text-sm text-ink/60">Every required room type has at least one usable photo.</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gate/30 bg-gate-soft px-4 py-3">
      <p className="text-sm font-medium text-gate">Missing from this listing</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {missingRoomTypes.map((room) => (
          <span
            key={room}
            className="px-2 py-0.5 rounded-sm bg-surface border border-gate/30 text-xs font-medium text-ink/80"
          >
            {room}
          </span>
        ))}
      </div>
      <p className="text-xs text-ink/50 mt-2">
        Derived from the room types Gemini has already classified — no extra analysis call needed.
      </p>
    </div>
  );
}
