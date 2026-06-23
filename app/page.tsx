'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ListingSummary } from '@/lib/types';
import { Header } from '@/components/Header';
import { NewListingForm } from '@/components/NewListingForm';
import { ListingCard } from '@/components/ListingCard';

export default function DashboardPage() {
  const [listings, setListings] = useState<ListingSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const data = await api.listListings();
      setListings(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings');
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate(title: string, address: string) {
    await api.createListing(title, address);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold">Your listings</h1>
            <p className="text-sm text-ink/45 mt-1">Upload photos — Zenrth handles the rest.</p>
          </div>
          <NewListingForm onCreate={handleCreate} />
        </div>

        {error && (
          <div className="rounded-xl border border-skip/30 bg-skip-soft text-skip text-sm px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {listings === null && !error && (
          <div className="flex items-center gap-3 text-ink/40">
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {listings?.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-hairline px-6 py-20 text-center">
            <p className="text-4xl mb-4">🏠</p>
            <p className="font-display text-lg font-semibold">No listings yet</p>
            <p className="text-sm text-ink/45 mt-2 mb-6">Create your first listing and upload photos to get started.</p>
            <NewListingForm onCreate={handleCreate} />
          </div>
        )}

        {listings && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
