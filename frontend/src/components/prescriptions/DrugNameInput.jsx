import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../../services/auth.js'

const MIN_CHARS = 2
const DEBOUNCE_MS = 150        // was 300 — the request is the slow part, not this
const MAX_OPTIONS = 8
const CACHE_MAX = 50

/* ---------- defensive field mapping ---------- */

function firstPrimitive(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstPrimitive(entry)
      if (found) return found
    }
    return ''
  }
  return ''
}

function firstOf(item, paths) {
  for (const path of paths) {
    const value = path
      .split('.')
      .reduce((current, key) => (current == null ? current : current[key]), item)
    const found = firstPrimitive(value)
    if (found) return found
  }
  return ''
}

const NAME_PATHS = [
  'display_name', 'name', 'drug_name', 'brand_name', 'brandName',
  'generic_name', 'genericName', 'proprietary_name',
  'openfda.brand_name', 'openfda.generic_name',
  'conceptProperties.name', 'substance_name',
]

const DETAIL_PATHS = [
  'strength', 'strength_name', 'dosage_form', 'form', 'route',
  'active_ingredient', 'openfda.dosage_form', 'openfda.route',
  'openfda.substance_name',
]

const KEY_PATHS = [
  'id', 'drug_id', 'rxcui', 'code', 'product_ndc', 'ndc',
  'openfda.product_ndc', 'conceptProperties.rxcui',
]

function toRows(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response?.drugs)) return response.drugs
  if (Array.isArray(response?.items)) return response.items
  return []
}

function toOptions(response) {
  const seen = new Set()
  const options = []

  toRows(response).forEach((row, index) => {
    const name = firstOf(row, NAME_PATHS)
    if (!name) return
    const dedupe = name.toLowerCase()
    if (seen.has(dedupe)) return
    seen.add(dedupe)

    options.push({
      key: firstOf(row, KEY_PATHS) || `${dedupe}-${index}`,
      name,
      detail: firstOf(row, DETAIL_PATHS),
      // Pre-lowered name so local filtering is cheap.
      lower: dedupe,
    })
  })

  return options
}

/* ---------- the input ---------- */

export default function DrugNameInput({ value, onChange, className = '', id, ...rest }) {
  const listId = useId()
  const wrapRef = useRef(null)
  const cacheRef = useRef(new Map())
  const requestRef = useRef(0)
  const skipSearchRef = useRef(false)

  /* ---- last successful fetch, for instant local filtering ---- */
  const servedQueryRef = useRef('')
  const servedOptionsRef = useRef([])

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState([])
  const [active, setActive] = useState(-1)

  function show(nextOptions) {
    setOptions(nextOptions.slice(0, MAX_OPTIONS))
    setOpen(nextOptions.length > 0)
    setActive(-1)
  }

  useEffect(() => {
    const query = String(value || '').trim().toLowerCase()

    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return undefined
    }

    if (query.length < MIN_CHARS) {
      servedQueryRef.current = ''
      servedOptionsRef.current = []
      setLoading(false)
      setOptions([])
      setOpen(false)
      setActive(-1)
      return undefined
    }

    /* ---- 1. INSTANT: narrow what we already have ---- */
    const servedQuery = servedQueryRef.current
    const served = servedOptionsRef.current

    if (servedQuery && query.startsWith(servedQuery) && served.length) {
      const local = served.filter((option) => option.lower.includes(query))
      if (local.length) {
        show(local)
        setLoading(false)
        return undefined   // good enough — don't fetch at all
      }
    }

    /* ---- 2. cache hit ---- */
    if (cacheRef.current.has(query)) {
      const cached = cacheRef.current.get(query)
      servedQueryRef.current = query
      servedOptionsRef.current = cached
      setLoading(false)
      show(cached)
      return undefined
    }

    /* ---- 3. ask the server ---- */
    setLoading(true)
    const timer = setTimeout(async () => {
      const token = ++requestRef.current
      try {
        const response = await api.get(`/drugs/search?name=${encodeURIComponent(query)}`)
        if (requestRef.current !== token) return

        const mapped = toOptions(response)
        cacheRef.current.set(query, mapped)
        if (cacheRef.current.size > CACHE_MAX) {
          cacheRef.current.delete(cacheRef.current.keys().next().value)
        }

        servedQueryRef.current = query
        servedOptionsRef.current = mapped
        setLoading(false)
        show(mapped)
      } catch {
        if (requestRef.current !== token) return
        setLoading(false)
        setOptions([])
        setOpen(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [value])

  useEffect(() => {
    function onPointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function choose(option) {
    skipSearchRef.current = true
    onChange?.(option.name)
    setOptions([])
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!options.length) return
      if (!open) {
        setOpen(true)
        setActive(0)
        return
      }
      setActive((current) => (current + 1) % options.length)
      return
    }

    if (event.key === 'ArrowUp') {
      if (!open || !options.length) return
      event.preventDefault()
      setActive((current) => (current <= 0 ? options.length - 1 : current - 1))
      return
    }

    if (event.key === 'Enter') {
      if (open && active >= 0 && options[active]) {
        event.preventDefault()
        choose(options[active])
      }
      return
    }

    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
        setActive(-1)
      }
      return
    }

    if (event.key === 'Tab') setOpen(false)
  }

  const showList = open && options.length > 0

  return (
    <div ref={wrapRef} className="relative">
      <input
        {...rest}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-busy={loading}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (options.length) setOpen(true)
        }}
        className={className}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.key}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => {
                event.preventDefault()
                choose(option)
              }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3.5 py-2 text-sm ${
                index === active ? 'bg-primary-tint text-primary' : 'text-ink'
              }`}
            >
              <span className="block font-medium">{option.name}</span>
              {option.detail && (
                <span className="block text-xs text-muted">{option.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Subtle progress hint while a request is in flight */}
      {loading && !showList && String(value || '').trim().length >= MIN_CHARS && (
        <p className="mt-1 text-xs text-muted">Searching…</p>
      )}
    </div>
  )
}
