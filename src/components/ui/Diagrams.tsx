"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CompareRow, StepItem, TreeNode } from "@/lib/lessons/types";

function TreeBranch({
  node,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  selectedId: string;
  onSelect: (node: TreeNode) => void;
}) {
  const isSelected = node.id === selectedId;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => onSelect(node)}
        aria-pressed={isSelected}
        className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium cursor-pointer ${
          isSelected
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100"
        }`}
      >
        {node.title}
      </button>

      {node.children && node.children.length > 0 ? (
        <>
          <ArrowDown size={16} aria-hidden="true" className="text-neutral-500" />
          <div className="flex flex-wrap items-start justify-center gap-3">
            {node.children.map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
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
    <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
      <div className="overflow-x-auto pb-2">
        <TreeBranch
          node={root}
          selectedId={selected.id}
          onSelect={setSelected}
        />
      </div>
      <div className="mt-4 rounded-md border border-neutral-300 bg-white p-3">
        <p className="text-sm font-semibold text-neutral-900">
          {selected.title}
        </p>
        <p className="mt-1 text-sm leading-6 text-neutral-800">
          {selected.description}
        </p>
      </div>
    </div>
  );
}

export function DiagramFlow({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
      <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {steps.map((step, index) => (
          <li
            key={`${step}-${index}`}
            className="flex flex-col items-center gap-2 sm:flex-row"
          >
            <span className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm text-neutral-900 sm:w-auto">
              {step}
            </span>
            {index < steps.length - 1 ? (
              <>
                <ArrowDown
                  size={16}
                  aria-hidden="true"
                  className="text-neutral-500 sm:hidden"
                />
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="hidden text-neutral-500 sm:inline"
                />
              </>
            ) : null}
          </li>
        ))}
      </ol>
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
    <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-neutral-600">
        <span>
          {index + 1} / {items.length}
        </span>
      </div>
      <div className="rounded-md border border-neutral-300 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-900">
          {current.title}
        </p>
        <div className="mt-2 text-sm leading-6 text-neutral-800">
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
    <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-300 bg-white p-3">
          <p className="mb-3 border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-900">
            {leftTitle}
          </p>
          <dl className="flex flex-col gap-2">
            {rows.map((row, idx) => (
              <div
                key={`left-${idx}`}
                className={`rounded border p-2 ${
                  row.diff
                    ? "border-neutral-500 bg-neutral-100"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <dt className="text-xs font-medium text-neutral-600">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm text-neutral-900">{row.left}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-md border border-neutral-300 bg-white p-3">
          <p className="mb-3 border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-900">
            {rightTitle}
          </p>
          <dl className="flex flex-col gap-2">
            {rows.map((row, idx) => (
              <div
                key={`right-${idx}`}
                className={`rounded border p-2 ${
                  row.diff
                    ? "border-neutral-900 bg-neutral-200"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <dt className="text-xs font-medium text-neutral-700">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-neutral-900">
                  {row.right}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
