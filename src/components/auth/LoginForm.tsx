"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Divider,
  Input,
  LinkButton,
  Notice,
  Stack,
} from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMessages } from "@/locales";

export function LoginForm() {
  const router = useRouter();
  const messages = getMessages();
  const configured = isSupabaseConfigured();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(messages.auth.errors.emailRequired);
      return;
    }

    if (password.length < 6) {
      setError(messages.auth.errors.passwordTooShort);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(messages.auth.supabaseNotConfigured);
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(messages.auth.errors.invalidCredentials);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError(messages.auth.supabaseNotConfigured);
      return;
    }

    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(messages.auth.errors.generic);
      setLoading(false);
    }
  }

  return (
    <Card title={messages.auth.loginTitle}>
      <Stack gap="md">
        {!configured ? (
          <Notice>{messages.auth.supabaseNotConfigured}</Notice>
        ) : null}

        {error ? <Notice>{error}</Notice> : null}

        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Input
              id="login-email"
              label={messages.auth.emailLabel}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!configured || loading}
            />
            <Input
              id="login-password"
              label={messages.auth.passwordLabel}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!configured || loading}
            />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={!configured || loading}
            >
              {loading ? messages.auth.loading : messages.auth.loginButton}
            </Button>
          </Stack>
        </form>

        <Divider />

        <Stack gap="sm">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={!configured || loading}
          >
            {messages.auth.googleButton}
          </Button>
          <LinkButton href="/royxat" variant="ghost" fullWidth>
            {messages.auth.noAccountLink}
          </LinkButton>
          <LinkButton href="/" variant="ghost" fullWidth>
            {messages.auth.continueAsGuest}
          </LinkButton>
        </Stack>
      </Stack>
    </Card>
  );
}
