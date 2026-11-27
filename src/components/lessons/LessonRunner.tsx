"use client";

import { useMemo, useState } from "react";
import { Terminal as TerminalIcon } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ChoiceList,
  CompareDiagram,
  DiagramFlow,
  DiagramTree,
  Input,
  LessonSplitLayout,
  LinkButton,
  Notice,
  PageTitle,
  PrereqLink,
  ProgressBar,
  ProseParagraph,
  QuestionBox,
  Stack,
  StepsDiagram,
  TaskAccordion,
} from "@/components/ui";
import {
  TerminalLoader,
} from "@/components/terminal/TerminalLoader";
import type { TerminalCommandEvent } from "@/components/terminal/Terminal";
import { renderRichTextTokens } from "@/components/lessons/RichText";
import { resolvePath } from "@/lib/terminal/path";
import type { GlossaryEntry, Lesson, LessonTask } from "@/lib/lessons/types";
import { getMessages } from "@/locales";

export interface PrerequisiteInfo {
  id: string;
  title: string;
  done: boolean;
}

export interface LessonRunnerProps {
  lesson: Lesson;
  glossary: Record<string, GlossaryEntry>;
  prerequisites: PrerequisiteInfo[];
  initialCompletedTaskIds: string[];
  username: string;
  userId: string | null;
  isGuest: boolean;
}

export function LessonRunner({
  lesson,
  glossary,
  prerequisites,
  initialCompletedTaskIds,
  username,
  userId,
  isGuest,
}: LessonRunnerProps) {
  const messages = getMessages();
  const t = messages.lessons;

  const [completedTasks, setCompletedTasks] = useState<string[]>(
    initialCompletedTaskIds,
  );
  const [showTerminal, setShowTerminal] = useState(lesson.hasTerminal);
  const [simplerMode, setSimplerMode] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  const completedSet = useMemo(() => new Set(completedTasks), [completedTasks]);

  async function markTaskComplete(taskId: string) {
    setCompletedTasks((prev) =>
      prev.includes(taskId) ? prev : [...prev, taskId],
    );

    if (isGuest) return;

    try {
      await fetch("/api/lessons/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, taskId }),
      });
    } catch {
      // Keep optimistic UI state if offline
    }
  }

  function handleCheckQuestion(task: LessonTask) {
    if (!task.question) return;
    const given = (answers[task.id] ?? "").trim();
    if (!given) return;

    const expected = task.question.answer.trim();
    const isCorrect = given.toLowerCase() === expected.toLowerCase();

    if (isCorrect) {
      setFeedback((prev) => ({
        ...prev,
        [task.id]: { ok: true, message: t.correctFeedback },
      }));
      void markTaskComplete(task.id);
    } else {
      setFeedback((prev) => ({
        ...prev,
        [task.id]: {
          ok: false,
          message: `${t.wrongTitle} ${task.question?.explanation ?? ""}`,
        },
      }));
    }
  }

  async function handleTerminalCommand(event: TerminalCommandEvent) {
    const trimmedCommand = event.command.trim();

    for (const task of lesson.tasks) {
      if (!task.terminalTask || completedSet.has(task.id)) continue;

      let commandOk = true;
      let fileOk = true;

      if (task.terminalTask.matchCommand) {
        const regex = new RegExp(task.terminalTask.matchCommand);
        commandOk = regex.test(trimmedCommand) && event.result.exitCode === 0;
      }

      if (task.terminalTask.checkFile) {
        const resolved = resolvePath(
          task.terminalTask.checkFile,
          event.cwd,
          event.fs.homeDir,
        );
        fileOk = await event.fs.exists(resolved);
      }

      if (commandOk && fileOk) {
        setFeedback((prev) => ({
          ...prev,
          [task.id]: { ok: true, message: t.terminalAutoDone },
        }));
        void markTaskComplete(task.id);
      }
    }
  }

  // Track first glossary occurrence across the entire lesson in render order
  const seenSlugs = new Set<string>();
  const renderText = (text: string) =>
    renderRichTextTokens(
      text,
      glossary,
      seenSlugs,
      messages.ui.close,
      messages.glossary.analogyLabel,
    );

  const leftColumn = (
    <Stack gap="md">
      <Stack direction="row" gap="sm">
        <LinkButton href="/darslar" variant="secondary">
          {t.backToLessons}
        </LinkButton>
        <Button
          variant="secondary"
          onClick={() => setShowTerminal((prev) => !prev)}
        >
          <TerminalIcon size={16} aria-hidden="true" />
          <span>{showTerminal ? t.hideTerminal : t.showTerminal}</span>
        </Button>
      </Stack>

      <PageTitle>{lesson.title}</PageTitle>

      <Stack gap="sm">
        <ProgressBar
          value={completedTasks.length}
          max={lesson.tasks.length || 1}
          label={t.progressLabel}
        />
        {isGuest ? <Notice>{t.guestNotSaved}</Notice> : null}
      </Stack>

      {prerequisites.length > 0 ? (
        <Card title={t.prerequisitesTitle}>
          <Stack direction="row" gap="sm">
            {prerequisites.map((prereq) => (
              <PrereqLink
                key={prereq.id}
                href={`/darslar/${prereq.id}`}
                title={prereq.title}
                done={prereq.done}
                doneLabel={t.done}
                notDoneLabel={t.notDone}
              />
            ))}
          </Stack>
        </Card>
      ) : null}

      <Card title={t.scenarioTitle}>
        <ProseParagraph>{renderText(lesson.scenario)}</ProseParagraph>
      </Card>

      {lesson.tasks.map((task, idx) => {
        const isDone = completedSet.has(task.id);
        const isSimpler = Boolean(simplerMode[task.id]);
        const taskFeedback = feedback[task.id];

        return (
          <TaskAccordion
            key={task.id}
            title={task.title}
            defaultOpen={idx === 0}
            badge={
              <Badge tone={isDone ? "success" : "neutral"}>
                {isDone ? t.done : t.notDone}
              </Badge>
            }
          >
            <Stack gap="md">
              {isSimpler && task.simpler ? (
                <ProseParagraph>{renderText(task.simpler)}</ProseParagraph>
              ) : (
                task.blocks.map((block, blockIdx) => {
                  if (block.type === "paragraph") {
                    return (
                      <ProseParagraph key={blockIdx}>
                        {renderText(block.text)}
                      </ProseParagraph>
                    );
                  }
                  if (block.type === "diagram-tree") {
                    return <DiagramTree key={blockIdx} root={block.root} />;
                  }
                  if (block.type === "diagram-flow") {
                    return <DiagramFlow key={blockIdx} steps={block.steps} />;
                  }
                  if (block.type === "steps") {
                    return (
                      <StepsDiagram
                        key={blockIdx}
                        items={block.items}
                        nextLabel={t.nextStep}
                        prevLabel={t.prevStep}
                        renderBody={(body) => renderText(body)}
                      />
                    );
                  }
                  if (block.type === "compare") {
                    return (
                      <CompareDiagram
                        key={blockIdx}
                        leftTitle={block.leftTitle}
                        rightTitle={block.rightTitle}
                        rows={block.rows}
                      />
                    );
                  }
                  return null;
                })
              )}

              {task.simpler ? (
                <Stack direction="row" gap="sm">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setSimplerMode((prev) => ({
                        ...prev,
                        [task.id]: !prev[task.id],
                      }))
                    }
                  >
                    {isSimpler ? t.normalButton : t.simplerButton}
                  </Button>
                </Stack>
              ) : null}

              {task.terminalTask ? (
                <QuestionBox prompt={t.terminalTaskLabel}>
                  <ProseParagraph>
                    {renderText(task.terminalTask.instruction)}
                  </ProseParagraph>
                  {!showTerminal ? (
                    <Button
                      variant="secondary"
                      onClick={() => setShowTerminal(true)}
                    >
                      {t.showTerminal}
                    </Button>
                  ) : null}
                  {isDone ? (
                    <Notice tone="success">{t.terminalAutoDone}</Notice>
                  ) : null}
                </QuestionBox>
              ) : null}

              {task.question ? (
                <QuestionBox prompt={task.question.prompt}>
                  {task.question.options && task.question.options.length > 0 ? (
                    <ChoiceList
                      options={task.question.options}
                      selected={answers[task.id] ?? ""}
                      onSelect={(opt) =>
                        setAnswers((prev) => ({ ...prev, [task.id]: opt }))
                      }
                    />
                  ) : (
                    <Input
                      id={`q-${task.id}`}
                      label={t.answerPlaceholder}
                      value={answers[task.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [task.id]: event.target.value,
                        }))
                      }
                    />
                  )}
                  <Stack direction="row" gap="sm">
                    <Button
                      variant="primary"
                      onClick={() => handleCheckQuestion(task)}
                    >
                      {t.checkAnswer}
                    </Button>
                  </Stack>
                  {taskFeedback ? (
                    <Notice tone={taskFeedback.ok ? "success" : "error"}>
                      {taskFeedback.message}
                    </Notice>
                  ) : null}
                </QuestionBox>
              ) : null}
            </Stack>
          </TaskAccordion>
        );
      })}
    </Stack>
  );

  const rightColumn = (
    <TerminalLoader
      username={username}
      userId={userId}
      isGuest={isGuest}
      onCommandExecuted={(event) => {
        void handleTerminalCommand(event);
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
