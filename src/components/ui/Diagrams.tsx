"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CompareRow, StepItem, TreeNode } from "@/lib/lessons/types";

const diagramShell = "rounded-2xl border border-line bg-deep/70 p-4";

function TreeBranch({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string;
  onSelect: (node: TreeNode) => void;
}) {
  const isSelected = node.id === selectedId;

  return (
    <div
      className="animate-rise flex flex-col items-center gap-3"
      style={{ animationDelay: `${depth * 140}ms` }}
    >
      <button
        type="button"
        onClick={() => onSelect(node)}
        aria-pressed={isSelected}
        className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-[background-color,border-color,transform] duration-200 cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          isSelected
            ? "border-accent bg-accent text-on-accent"
            : "border-line bg-card text-ink hover:border-line-strong hover:bg-card-hover"
        }`}
      >
        {node.title}
      </button>

      {node.children && node.children.length > 0 ? (
        <>
          <ArrowDown size={16} aria-hidden="true" className="text-ink-subtle" />
          <div className="flex flex-wrap items-start justify-center gap-3">
            {node.children.map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function DiagramTree({ root }: { root: TreeNode }) {
  const [selected, setSelected] = useState<TreeNode>(root);

  return (
    <div className={diagramShell}>
      <div className="overflow-x-auto pb-2">
        <TreeBranch
          node={root}
          depth={0}
          selectedId={selected.id}
          onSelect={setSelected}
        />
      </div>
      <div
        key={selected.id}
        className="animate-rise mt-4 rounded-xl border border-accent/40 bg-card p-3"
      >
        <p className="text-sm font-semibold text-accent">{selected.title}</p>
        <p className="mt-1 text-sm leading-6 text-ink">{selected.description}</p>
      </div>
    </div>
  );
}

export function DiagramFlow({ steps }: { steps: string[] }) {
  return (
    <div className={diagramShell}>
      <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {steps.map((step, index) => (
          <li
            key={`${step}-${index}`}
            className="animate-rise flex flex-col items-center gap-2 sm:flex-row"
            style={{ animationDelay: `${index * 160}ms` }}
          >
            <span className="flex w-full items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink sm:w-auto">
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs text-accent"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </span>
            {index < steps.length - 1 ? (
              <>
                <ArrowDown
                  size={16}
                  aria-hidden="true"
                  className="text-accent sm:hidden"
                />
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="hidden text-accent sm:inline"
                />
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A row of dots with a marker that slides to the current step, like a packet moving along a path. */
function StepTrack({ count, index }: { count: number; index: number }) {
  const percent = count > 1 ? (index / (count - 1)) * 100 : 0;

  return (
    <div aria-hidden="true" className="relative mx-3 my-2 h-6">
      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line" />
      <div
        className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-accent transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-500 ${
            i <= index ? "border-accent bg-accent" : "border-line-strong bg-deep"
          }`}
          style={{ left: `${count > 1 ? (i / (count - 1)) * 100 : 0}%` }}
        />
      ))}
      <span
        className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent-soft transition-[left] duration-700 ease-out"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}

export function StepsDiagram({
  items,
  nextLabel,
  prevLabel,
  renderBody,
}: {
  items: StepItem[];
  nextLabel: string;
  prevLabel: string;
  renderBody?: (body: string) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const current = items[index];
  if (!current) return null;

  return (
    <div className={diagramShell}>
      <div className="mb-1 flex items-center justify-between font-mono text-xs text-ink-subtle">
        <span>
          {index + 1} / {items.length}
        </span>
      </div>
      <StepTrack count={items.length} index={index} />
      <div
        key={index}
        className="animate-rise mt-3 rounded-xl border border-line bg-card p-4"
      >
        <p className="text-base font-semibold text-ink">{current.title}</p>
        <div className="mt-2 text-sm leading-7 text-ink">
          {renderBody ? renderBody(current.body) : current.body}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
          disabled={index === 0}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>{prevLabel}</span>
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            setIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0))
          }
        >
          <span>{nextLabel}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function CompareColumn({
  title,
  rows,
  side,
}: {
  title: string;
  rows: CompareRow[];
  side: "left" | "right";
}) {
  return (
    <div
      className="animate-rise rounded-xl border border-line bg-card p-3"
      style={{ animationDelay: side === "right" ? "120ms" : "0ms" }}
    >
      <p className="mb-3 border-b border-line pb-2 text-sm font-semibold text-ink">
        {title}
      </p>
      <dl className="flex flex-col gap-2">
        {rows.map((row, idx) => (
          <div
            key={`${side}-${idx}`}
            className={`rounded-lg border p-2 ${
              row.diff
                ? "animate-flash border-accent/60 bg-accent-soft"
                : "border-line bg-deep/60"
            }`}
          >
            <dt className="text-xs font-medium text-ink-subtle">{row.label}</dt>
            <dd
              className={`mt-0.5 text-sm ${
                row.diff ? "font-medium text-ink" : "text-ink-muted"
              }`}
            >
              {side === "left" ? row.left : row.right}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CompareDiagram({
  leftTitle,
  rightTitle,
  rows,
}: {
  leftTitle: string;
  rightTitle: string;
  rows: CompareRow[];
}) {
  return (
    <div className={diagramShell}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CompareColumn title={leftTitle} rows={rows} side="left" />
        <CompareColumn title={rightTitle} rows={rows} side="right" />
      </div>
    </div>
  );
}
