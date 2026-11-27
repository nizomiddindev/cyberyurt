"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
}

export function Tabs({ items, defaultTabId }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? items[0]?.id ?? "");
  const activeTab = items.find((item) => item.id === activeId) ?? items[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div>
      <div
        role="tablist"
        className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-deep p-1"
      >
        {items.map((item) => {
          const isActive = item.id === activeTab.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(item.id)}
              className={`min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                isActive
                  ? "bg-card text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" key={activeTab.id} className="animate-rise pt-4">
        {activeTab.content}
      </div>
    </div>
  );
}
