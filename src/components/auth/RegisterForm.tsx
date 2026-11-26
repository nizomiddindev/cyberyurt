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
import {
  validateDisplayName,
  validateUsername,
} from "@/lib/validation/username";
import { getMessages } from "@/locales";

export function RegisterForm() {
  const router = useRouter();
  const messages = getMessages();
  const configured = isSupabaseConfigured();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameError(null);
    setDisplayNameError(null);
    setFormError(null);
    setInfoMessage(null);

    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      setUsernameError(messages.auth.errors[usernameCheck.error]);
      return;
    }

    const displayNameCheck = validateDisplayName(displayName);
    if (!displayNameCheck.valid) {
      setDisplayNameError(messages.auth.errors[displayNameCheck.error]);
      return;
    }

    if (!email.trim()) {
      setFormError(messages.auth.errors.emailRequired);
      return;
    }

    if (password.length < 6) {
      setFormError(messages.auth.errors.passwordTooShort);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setFormError(messages.auth.supabaseNotConfigured);
      return;
    }

    setLoading(true);

    const { data: available, error: rpcError } = await supabase.rpc(
      "is_username_available",
      { candidate: usernameCheck.normalized },
    );

    if (rpcError) {
      setFormError(messages.auth.errors.generic);
      setLoading(false);
      return;
    }

    if (!available) {
      setUsernameError(messages.auth.errors.usernameTaken);
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: usernameCheck.normalized,
          display_name: displayNameCheck.normalized,
        },
      },
    });

    if (signUpError) {
      setFormError(messages.auth.errors.generic);
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          username: usernameCheck.normalized,
          display_name: displayNameCheck.normalized,
          role: "student",
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      router.push("/");
      router.refresh();
      return;
    }

    setInfoMessage(messages.auth.checkEmail);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setFormError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setFormError(messages.auth.supabaseNotConfigured);
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
      setFormError(messages.auth.errors.generic);
      setLoading(false);
    }
  }

  return (
    <Card title={messages.auth.registerTitle}>
      <Stack gap="md">
        {!configured ? (
          <Notice>{messages.auth.supabaseNotConfigured}</Notice>
        ) : null}

        {formError ? <Notice>{formError}</Notice> : null}
        {infoMessage ? <Notice>{infoMessage}</Notice> : null}

        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Input
              id="register-username"
              label={messages.auth.usernameLabel}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              error={usernameError}
              onChange={(event) => setUsername(event.target.value)}
              disabled={!configured || loading}
            />
            <Input
              id="register-display-name"
              label={messages.auth.displayNameLabel}
              type="text"
              autoComplete="name"
              value={displayName}
              error={displayNameError}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={!configured || loading}
            />
            <Input
              id="register-email"
              label={messages.auth.emailLabel}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!configured || loading}
            />
            <Input
              id="register-password"
              label={messages.auth.passwordLabel}
              type="password"
              autoComplete="new-password"
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
              {loading ? messages.auth.loading : messages.auth.registerButton}
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
          <LinkButton href="/kirish" variant="ghost" fullWidth>
            {messages.auth.haveAccountLink}
          </LinkButton>
          <LinkButton href="/" variant="ghost" fullWidth>
            {messages.auth.continueAsGuest}
          </LinkButton>
        </Stack>
      </Stack>
    </Card>
  );
}
