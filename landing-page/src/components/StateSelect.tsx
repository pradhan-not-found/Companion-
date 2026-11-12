'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * A sleek, searchable dropdown that matches the checkout inputs.
 * Keyboard: ArrowUp/ArrowDown to move, Enter to choose, Escape to close, type to filter.
 */
export default function StateSelect({
  value,
  options,
  onChange,
  invalid,
  label
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  invalid?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(option => option.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const away = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  function openList() {
    setQuery('');
    setCursor(Math.max(0, options.indexOf(value)));
    setOpen(true);
  }

  function choose(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div ref={root} className="ck-select relative">
      <button
        type="button"
        className={`ck-input ck-select__trigger${invalid ? ' is-invalid' : ''}${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openList();
          }
        }}
      >
        <span className="truncate">{value}</span>
        <svg className="ck-select__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="ck-select__menu">
          <div className="ck-select__search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={search}
              value={query}
              aria-label={`Search ${label}`}
              aria-controls={listId}
              onChange={event => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setCursor(index => Math.min(filtered.length - 1, index + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setCursor(index => Math.max(0, index - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  if (filtered[cursor]) choose(filtered[cursor]);
                } else if (event.key === 'Escape') {
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul ref={list} id={listId} role="listbox" aria-label={label} className="ck-select__list">
            {filtered.length ? (
              filtered.map((option, index) => (
                <li
                  key={option}
                  role="option"
                  aria-selected={option === value}
                  data-index={index}
                  className={`ck-select__option${index === cursor ? ' is-active' : ''}${option === value ? ' is-selected' : ''}`}
                  onPointerEnter={() => setCursor(index)}
                  onClick={() => choose(option)}
                >
                  {option}
                  {option === value ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="ck-select__empty">No matches</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
