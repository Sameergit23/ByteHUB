"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { Label } from "./Label";

export interface ComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  id?: string;
  /** Most suggestions shown at once. */
  maxResults?: number;
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Best matches first: whole name starts with the query, then a word does, then anywhere. */
function search(options: string[], query: string, limit: number): string[] {
  const q = normalise(query);
  if (!q) return options.slice(0, limit);
  const words = q.split(" ");
  const scored: { option: string; score: number }[] = [];
  for (const option of options) {
    const text = normalise(option);
    if (!words.every((w) => text.includes(w))) continue;
    const score = text.startsWith(q)
      ? 0
      : text.split(" ").some((part) => part.startsWith(words[0]!))
        ? 1
        : 2;
    scored.push({ option, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.option.localeCompare(b.option))
    .slice(0, limit)
    .map((s) => s.option);
}

/**
 * Text field with a searchable list of suggestions. Picking one fills the field; anything the
 * suggestions don't cover can simply be typed. Keyboard: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  helperText,
  required,
  id,
  maxResults = 8,
}: ComboboxProps) {
  const autoId = useId();
  const inputId = id || `combobox-${autoId}`;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => search(options, value, maxResults),
    [options, value, maxResults]
  );
  const exact = options.some((o) => normalise(o) === normalise(value));
  const showList = open && (results.length > 0 || value.trim().length > 0);

  const pick = (option: string) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && open && active >= 0 && results[active]) {
      e.preventDefault();
      pick(results[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="w-full space-y-1.5">
      <Label htmlFor={inputId} required={required} error={error} helperText={helperText}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className={`w-full min-h-[44px] px-3.5 py-2.5 pr-10 text-sm bg-white text-ink border transition-colors placeholder:text-editorial-muted/70 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 ${
            error
              ? "border-accent focus-visible:outline-accent"
              : "border-editorial-border hover:border-ink focus-visible:border-ink"
          }`}
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-editorial-muted"
          aria-hidden="true"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13 13l4 4" strokeLinecap="square" />
          </svg>
        </span>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto border border-ink bg-white shadow-lg"
          >
            {results.map((option, i) => (
              <li
                key={option}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown (not click) so the choice lands before the field loses focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(option);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3.5 py-2.5 text-sm ${
                  i === active ? "bg-ink text-canvas" : "text-ink hover:bg-canvas"
                }`}
              >
                {option}
              </li>
            ))}
            {value.trim() && !exact && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                }}
                className="cursor-pointer border-t border-editorial-line px-3.5 py-2.5 text-xs text-editorial-muted hover:bg-canvas"
              >
                {results.length === 0 ? "Not in the list? " : "Or keep "}
                <span className="font-semibold text-ink">
                  &ldquo;{value.trim()}&rdquo;
                </span>{" "}
                as typed
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
