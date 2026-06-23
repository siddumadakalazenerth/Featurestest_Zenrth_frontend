'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = registering
        ? await api.register(name, email, password)
        : await api.login(email, password);
      setAuthToken(result.token);
      router.replace('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not continue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-7 shadow-sm">
        <p className="font-display text-2xl font-bold">Zenrth</p>
        <h1 className="mt-6 font-display text-xl font-semibold">
          {registering ? 'Create your workspace' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-ink/50">Your properties and AI activity stay inside your account.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {registering && (
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm" />
          )}
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm" />
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm" />
          {error && <p className="text-xs text-skip">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
            {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button type="button" onClick={() => setRegistering((value) => !value)} className="mt-4 text-xs font-medium text-analysis hover:underline">
          {registering ? 'Already have an account? Sign in' : 'New to Zenrth? Create an account'}
        </button>
      </div>
    </main>
  );
}
