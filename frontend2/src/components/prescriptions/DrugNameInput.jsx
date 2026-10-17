import { useEffect, useId, useRef, useState } from "react";
import { api } from "../../services/api";
import { toList } from "../../utils/format";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

// Accepts either the search shape or the detail shape from the backend
function normalize(row) {
  return {
    name: row.name || row.drug_name || "",
    generic: row.generic_name || row.description || "",
    dosage: row.standard_dosage || row.dosage || "",
    warnings: row.warnings || "",
    interactions: row.interactions || "",
  };
}

export default function DrugNameInput({ value, onChange, onSelect, className = "", ...rest }) {
  const listId = useId();
  const wrap = useRef(null);
  const cache = useRef(new Map());
  const request = useRef(0);
  const skip = useRef(false);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const query = String(value || "").trim().toLowerCase();

    if (skip.current) {
      skip.current = false;
      return undefined;
    }
    if (query.length < MIN_CHARS) {
      setOptions([]);
      setOpen(false);
      setLoading(false);
      return undefined;
    }
    if (cache.current.has(query)) {
      const hit = cache.current.get(query);
      setOptions(hit);
      setOpen(hit.length > 0);
      setActive(-1);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const token = ++request.current;
      try {
        const rows = toList(await api.get(`/drugs/search?name=${encodeURIComponent(query)}`));
        if (request.current !== token) return;
        const seen = new Set();
        const mapped = rows
          .map(normalize)
          .filter((d) => d.name && !seen.has(d.name.toLowerCase()) && seen.add(d.name.toLowerCase()))
          .slice(0, 8);
        cache.current.set(query, mapped);
        setOptions(mapped);
        setOpen(mapped.length > 0);
        setActive(-1);
      } catch {
        if (request.current !== token) return;
        setOptions([]);
        setOpen(false);
      } finally {
        if (request.current === token) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const away = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  const choose = (drug) => {
    skip.current = true;
    onChange(drug.name);
    onSelect?.(drug);
    setOptions([]);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="relative">
      <input
        {...rest}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => options.length && setOpen(true)}
        className={className}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((d, i) => (
            <li
              key={d.name}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => {
                e.preventDefault();
                choose(d);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3.5 py-2 text-sm ${i === active ? "bg-blue-50 text-primary" : ""}`}
            >
              <span className="block font-medium">{d.name}</span>
              {(d.generic || d.dosage) && (
                <span className="block text-xs text-muted">
                  {[d.generic, d.dosage].filter(Boolean).join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {loading && !open && String(value || "").trim().length >= MIN_CHARS && (
        <p className="mt-1 text-xs text-muted">Searching…</p>
      )}
    </div>
  );
}