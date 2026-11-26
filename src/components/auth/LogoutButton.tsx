"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getMessages } from "@/locales";

export function LogoutButton() {
  const router = useRouter();
  const messages = getMessages();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <Button variant="secondary" onClick={handleLogout} disabled={loading}>
      <LogOut size={16} aria-hidden="true" />
      <span>{messages.nav.logout}</span>
    </Button>
  );
}
