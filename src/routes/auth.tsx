import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coffee } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Brew & Bean" },
      {
        name: "description",
        content: "Sign in or create your Brew & Bean account to order ahead and collect loyalty stamps.",
      },
      { property: "og:title", content: "Sign in — Brew & Bean" },
      { property: "og:description", content: "Order ahead and collect loyalty stamps." },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        toast.success("Welcome to Brew & Bean!");
        navigate({ to: "/", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/", replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in didn't work. Please try again.");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Google sign-in didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh justify-center bg-[oklch(0.93_0.02_78)] sm:py-8">
      <div className="flex w-full max-w-[430px] flex-col bg-background px-6 pb-10 pt-14 shadow-lift sm:rounded-[2.5rem]">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-soft">
            <Coffee className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Brew &amp; Bean</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to order ahead and skip the line."
              : "Create an account and start collecting stamps."}
          </p>
        </div>

        {checkEmail ? (
          <div className="rounded-3xl border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Tap it to
              activate your account, then come back and sign in.
            </p>
            <PrimaryButton
              variant="outline"
              className="mt-5"
              fullWidth
              onClick={() => {
                setCheckEmail(false);
                setMode("signin");
              }}
            >
              Back to sign in
            </PrimaryButton>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <PrimaryButton type="submit" fullWidth loading={busy} className="mt-2">
                {mode === "signin" ? "Sign in" : "Create account"}
              </PrimaryButton>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <PrimaryButton variant="outline" fullWidth onClick={handleGoogle} disabled={busy}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
                />
              </svg>
              Continue with Google
            </PrimaryButton>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to Brew & Bean?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </>
        )}

        <Link
          to="/"
          className="mt-8 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Browse the menu instead
        </Link>
      </div>
    </div>
  );
}
