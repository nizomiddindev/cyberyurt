"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Notice, Stack } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  validateDisplayName,
  validateUsername,
} from "@/lib/validation/username";
import { getMessages } from "@/locales";

export function ProfileSetupForm({ userId }: { userId: string }) {
  const router = useRouter();
  const messages = getMessages();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameError(null);
    setDisplayNameError(null);
    setFormError(null);

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

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      username: usernameCheck.normalized,
      display_name: displayNameCheck.normalized,
      role: "student",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setUsernameError(messages.auth.errors.usernameTaken);
      } else {
        setFormError(messages.auth.errors.generic);
      }
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Card title={messages.auth.setupTitle}>
      <Stack gap="md">
        {formError ? <Notice>{formError}</Notice> : null}

        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="md">
            <Input
              id="setup-username"
              label={messages.auth.usernameLabel}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              error={usernameError}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
            />
            <Input
              id="setup-display-name"
              label={messages.auth.displayNameLabel}
              type="text"
              autoComplete="name"
              value={displayName}
              error={displayNameError}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={loading}
            />
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading
                ? messages.auth.loading
                : messages.auth.saveProfileButton}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}
