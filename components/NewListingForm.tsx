'use client';

import { useState } from 'react';

interface NewListingFormProps {
  onCreate: (title: string, address: string) => Promise<void>;
}

export function NewListingForm({ onCreate }: NewListingFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 rounded-sm bg-ink text-paper text-sm font-medium hover:bg-ink/90"
      >
        New listing
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate(title.trim(), address.trim());
      setTitle('');
      setAddress('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-surface border border-hairline rounded-md p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-ink/60">Listing title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="2BHK, Banjara Hills"
          className="border border-hairline rounded-sm px-3 py-2 text-sm w-56 bg-paper"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-ink/60">Address (optional)</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Road No. 12, Hyderabad"
          className="border border-hairline rounded-sm px-3 py-2 text-sm w-64 bg-paper"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="px-4 py-2 rounded-sm bg-analysis text-white text-sm font-medium hover:bg-analysis/90 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-3 py-2 text-sm text-ink/50 hover:text-ink"
      >
        Cancel
      </button>
    </form>
  );
}
