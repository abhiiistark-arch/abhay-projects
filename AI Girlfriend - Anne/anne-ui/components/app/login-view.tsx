'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LoginView() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          website: formData.get('website'),
        }),
      });

      if (!response.ok) {
        setError('Incorrect password. Try again.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6">
      <section className="bg-background flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative mb-6 h-52 w-40 overflow-hidden rounded-2xl border-2 border-[#6B8F71]/40 bg-white shadow-xl sm:h-64 sm:w-48 dark:bg-zinc-900">
          <Image
            src="/anne.png"
            alt="Anne"
            fill
            priority
            className="object-cover object-top"
            sizes="(max-width: 640px) 160px, 192px"
          />
        </div>

        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Private access</h1>
        <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed">
          Enter the password to talk with Anne.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-full border px-4 py-3 text-sm outline-none focus-visible:ring-2"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full rounded-full bg-[#6B8F71] font-mono text-xs font-bold tracking-wider uppercase hover:bg-[#5a7a60] disabled:opacity-70 dark:bg-[#8FB996] dark:hover:bg-[#7aa882]"
          >
            {isLoading ? 'Checking...' : 'Enter'}
          </Button>
        </form>
      </section>
    </div>
  );
}
