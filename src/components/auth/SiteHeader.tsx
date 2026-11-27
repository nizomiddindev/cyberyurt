import {
  BookOpen,
  BookText,
  Flag,
  Home,
  Terminal as TerminalIcon,
  Trophy,
} from "lucide-react";
import { Badge, Header, LinkButton, Stack } from "@/components/ui";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { siteConfig } from "@/config/site";
import { getCurrentViewer } from "@/lib/auth/viewer";
import { getMessages } from "@/locales";

function getNavItems() {
  const messages = getMessages();
  return [
    {
      href: "/",
      label: messages.nav.home,
      icon: <Home size={16} aria-hidden="true" />,
    },
    {
      href: "/darslar",
      label: messages.nav.lessons,
      icon: <BookOpen size={16} aria-hidden="true" />,
    },
    {
      href: "/mashq",
      label: messages.nav.practice,
      icon: <Flag size={16} aria-hidden="true" />,
    },
    {
      href: "/reyting",
      label: messages.nav.leaderboard,
      icon: <Trophy size={16} aria-hidden="true" />,
    },
    {
      href: "/lugat",
      label: messages.nav.glossary,
      icon: <BookText size={16} aria-hidden="true" />,
    },
    {
      href: "/terminal",
      label: messages.nav.terminal,
      icon: <TerminalIcon size={16} aria-hidden="true" />,
    },
  ];
}

export function SiteHeaderFallback() {
  const messages = getMessages();
  return (
    <Header
      brandName={siteConfig.siteName}
      navItems={getNavItems()}
      menuLabel={messages.nav.menu}
      closeLabel={messages.ui.close}
    />
  );
}

export async function SiteHeader() {
  const messages = getMessages();
  const viewer = await getCurrentViewer();

  const actions = viewer.isGuest ? (
    <Stack direction="row" gap="sm">
      <Badge>{viewer.username}</Badge>
      <LinkButton href="/kirish" variant="secondary">
        {messages.nav.login}
      </LinkButton>
      <LinkButton href="/royxat" variant="primary">
        {messages.nav.register}
      </LinkButton>
    </Stack>
  ) : (
    <Stack direction="row" gap="sm">
      {viewer.needsProfileSetup ? (
        <Badge>{viewer.username}</Badge>
      ) : (
        <LinkButton
          href={`/profil/${encodeURIComponent(viewer.username)}`}
          variant="ghost"
        >
          {viewer.username}
        </LinkButton>
      )}
      <Badge>
        {messages.profile.levelShort} {viewer.level}
      </Badge>
      <Badge>{viewer.xp} XP</Badge>
      <Badge>{messages.roles[viewer.role]}</Badge>
      <LogoutButton />
    </Stack>
  );

  return (
    <Header
      brandName={siteConfig.siteName}
      navItems={getNavItems()}
      menuLabel={messages.nav.menu}
      closeLabel={messages.ui.close}
      actions={actions}
    />
  );
}
