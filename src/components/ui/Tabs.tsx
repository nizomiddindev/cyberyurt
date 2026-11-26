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
        className="flex flex-wrap gap-1 border-b border-neutral-300"
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
              className={`min-h-11 px-4 py-2 text-sm font-medium cursor-pointer border-b-2 ${
                isActive
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {activeTab.content}
      </div>
    </div>
  );
}
