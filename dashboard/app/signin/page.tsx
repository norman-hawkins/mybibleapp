"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("admin@apostolicgraphix.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res) {
      setErr("No response from server.");
      return;
    }

    if (res.error) {
      setErr("Invalid email or password.");
      return;
    }

    router.push(res.url ?? callbackUrl);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbfbfa]">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Left: Brand / info */}
          <div className="hidden lg:block">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white shadow-sm">
                  <span className="text-base font-semibold">A</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">
                    Apostolic Graphix
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    Commentary Studio
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-2xl font-semibold text-[var(--ink)]">
                  Welcome back
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Sign in to manage commentary drafts, submit for review, and publish approved entries.
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[#fbfbfa] p-4">
                <div className="text-xs font-semibold text-[var(--muted)]">Tip</div>
                <div className="mt-2 text-sm text-[var(--muted)]">
                  Contributors submit entries for review. Admins can approve, publish, or reject with notes.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-7 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[var(--ink)]">Sign in</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  Enter your credentials to access the dashboard.
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#fbfbfa] px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                <span className="text-xs font-semibold text-[var(--muted)]">Secure</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">Email</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@apostolicgraphix.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--muted)]">Password</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-black"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              {err ? (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#991b1b]">
                  {err}
                </div>
              ) : null}

              <button
                disabled={loading}
                className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="pt-2 text-center text-xs text-[var(--muted)]">
                By signing in, you agree to follow the editorial workflow (draft → review → publish).
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfa]" />}>
      <SignInInner />
    </Suspense>
  );
}