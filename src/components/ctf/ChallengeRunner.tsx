"use client";

import { useState, type FormEvent } from "react";
import { FolderDown, Terminal as TerminalIcon } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ChallengeFileLink,
  HintRow,
  Input,
  LessonSplitLayout,
  LinkButton,
  Notice,
  PageTitle,
  ProseParagraph,
  Stack,
  type NoticeTone,
} from "@/components/ui";
import { TerminalLoader } from "@/components/terminal/TerminalLoader";
import type { TerminalSeedRequest } from "@/components/terminal/Terminal";
import type {
  PublicChallengeDetail,
  PublicChallengeHint,
} from "@/lib/ctf/types";
import { getMessages } from "@/locales";

export interface ChallengeRunnerProps {
  challenge: PublicChallengeDetail;
  username: string;
  userId: string | null;
  isGuest: boolean;
}

export function ChallengeRunner({
  challenge,
  username,
  userId,
  isGuest,
}: ChallengeRunnerProps) {
  const messages = getMessages();
  const t = messages.ctf;
  const lt = messages.lessons;

  const [showTerminal, setShowTerminal] = useState(true);
  const [hints, setHints] = useState<PublicChallengeHint[]>(challenge.hints);
  const [unlockingHintId, setUnlockingHintId] = useState<string | null>(null);
  const [solved, setSolved] = useState(challenge.solved);
  const [flagInput, setFlagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<NoticeTone>("info");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const [seedRequest, setSeedRequest] = useState<TerminalSeedRequest | null>(
    null,
  );

  async function handleLoadIntoTerminal() {
    setLoadingFiles(true);
    setLoadNotice(null);
    setShowTerminal(true);

    try {
      const loadedFiles: { name: string; bytes: Uint8Array }[] = [];
      for (const fileName of challenge.files) {
        const res = await fetch(
          `/api/challenges/${encodeURIComponent(challenge.slug)}/files/${encodeURIComponent(fileName)}`,
        );
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        loadedFiles.push({ name: fileName, bytes: new Uint8Array(buf) });
      }

      const targetDir = `~/challenges/${challenge.slug}`;
      setSeedRequest({
        id: Date.now(),
        targetDir,
        files: loadedFiles,
      });
    } catch {
      setLoadNotice(t.statusError);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleUnlockHint(hintId: string) {
    setUnlockingHintId(hintId);
    try {
      const res = await fetch("/api/ctf/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: challenge.slug, hintId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        hintId: string;
        text: string;
        cost: number;
      };
      setHints((prev) =>
        prev.map((h) =>
          h.id === data.hintId ? { ...h, unlocked: true, text: data.text } : h,
        ),
      );
    } finally {
      setUnlockingHintId(null);
    }
  }

  async function handleSubmitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flagInput.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/ctf/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: challenge.slug,
          flag: flagInput.trim(),
        }),
      });
      const data = (await res.json()) as {
        status?: string;
        pointsAwarded?: number;
      };

      if (res.status === 429 || data.status === "rate_limited") {
        setFeedbackTone("info");
        setFeedback(t.statusRateLimited);
      } else if (data.status === "correct") {
        setSolved(true);
        const pts = data.pointsAwarded ?? challenge.points;
        setFeedbackTone("success");
        setFeedback(`${t.statusCorrect} +${pts} ${t.statusCorrectPoints}`);
      } else if (data.status === "already_solved") {
        setSolved(true);
        setFeedbackTone("success");
        setFeedback(t.statusAlreadySolved);
      } else if (data.status === "wrong") {
        setFeedbackTone("error");
        setFeedback(t.statusWrong);
      } else {
        setFeedbackTone("info");
        setFeedback(t.statusError);
      }
    } catch {
      setFeedbackTone("info");
      setFeedback(t.statusError);
    } finally {
      setSubmitting(false);
    }
  }

  const leftColumn = (
    <Stack gap="md">
      <Stack direction="row" gap="sm">
        <LinkButton href="/mashq" variant="secondary">
          {t.backToList}
        </LinkButton>
        <Button
          variant="secondary"
          onClick={() => setShowTerminal((prev) => !prev)}
        >
          <TerminalIcon size={16} aria-hidden="true" />
          <span>{showTerminal ? lt.hideTerminal : lt.showTerminal}</span>
        </Button>
      </Stack>

      <PageTitle>{challenge.title}</PageTitle>

      <Stack direction="row" gap="sm">
        <Badge>{challenge.category}</Badge>
        <Badge>{t.difficulty[challenge.difficulty]}</Badge>
        <Badge>
          {challenge.points} {t.pointsUnit}
        </Badge>
        <Badge>{solved ? t.solved : t.unsolved}</Badge>
      </Stack>

      {isGuest ? <Notice>{t.guestNotSaved}</Notice> : null}

      <Card>
        <ProseParagraph>{challenge.description}</ProseParagraph>
      </Card>

      {challenge.files.length > 0 ? (
        <Card title={t.filesTitle}>
          <Stack gap="md">
            <Stack direction="row" gap="sm">
              <Button
                variant="primary"
                onClick={() => {
                  void handleLoadIntoTerminal();
                }}
                disabled={loadingFiles}
              >
                <FolderDown size={16} aria-hidden="true" />
                <span>{t.loadIntoTerminal}</span>
              </Button>
              {challenge.files.map((fileName) => (
                <ChallengeFileLink
                  key={fileName}
                  href={`/api/challenges/${encodeURIComponent(challenge.slug)}/files/${encodeURIComponent(fileName)}`}
                  fileName={fileName}
                />
              ))}
            </Stack>
            {loadNotice ? <Notice>{loadNotice}</Notice> : null}
          </Stack>
        </Card>
      ) : null}

      {hints.length > 0 ? (
        <Card title={t.hintsTitle}>
          <Stack gap="sm">
            {hints.map((hint) => (
              <HintRow
                key={hint.id}
                costLabel={`-${hint.cost} ${t.hintCostSuffix}`}
                unlockLabel={t.unlockHint}
                unlocked={hint.unlocked}
                text={hint.text}
                loading={unlockingHintId === hint.id}
                onUnlock={() => {
                  void handleUnlockHint(hint.id);
                }}
              />
            ))}
          </Stack>
        </Card>
      ) : null}

      <Card title={t.flagTitle}>
        <form onSubmit={(event) => void handleSubmitFlag(event)}>
          <Stack gap="md">
            <Input
              id="ctf-flag-input"
              label={t.flagLabel}
              placeholder={t.flagPlaceholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              value={flagInput}
              onChange={(event) => setFlagInput(event.target.value)}
              disabled={submitting}
            />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={submitting}
            >
              {t.submitFlag}
            </Button>
            {feedback ? <Notice tone={feedbackTone}>{feedback}</Notice> : null}
          </Stack>
        </form>
      </Card>
    </Stack>
  );

  const rightColumn = (
    <TerminalLoader
      username={username}
      userId={userId}
      isGuest={isGuest}
      seedRequest={seedRequest}
      onSeedComplete={(targetDir) => {
        setLoadNotice(`${t.loadedIntoTerminal}: ${targetDir}/`);
      }}
    />
  );

  return (
    <LessonSplitLayout
      left={leftColumn}
      right={rightColumn}
      showRight={showTerminal}
    />
  );
}
