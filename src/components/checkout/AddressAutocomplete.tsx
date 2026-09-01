import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteResult {
  name: string;
  code: number;
}

interface AddressAutocompleteProps {
  type: "city" | "street";
  cityCode?: number;
  value: string;
  onChange: (value: string, code?: number) => void;
  placeholder: string;
  disabled?: boolean;
  /** Called when the government lookup fails, so the form can offer free text */
  onLookupError?: (hasError: boolean) => void;
}

const CITIES_RESOURCE_ID = "b7cf8f14-64a2-4b33-8d4b-edb286fdbd37";
const STREETS_RESOURCE_ID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";
// data.gov.il no longer sends CORS headers, so the browser can't call it
// directly. api/gov-address.ts proxies it same-origin (Vite proxies the same
// path to data.gov.il in local dev — see vite.config.ts).
const API_BASE = "/api/gov-address";

// data.gov.il is a third party that goes down; never let it block checkout.
const LOOKUP_TIMEOUT_MS = 6000;

// Cache: fetch all cities/streets once, filter client-side for instant prefix matching
const cache: Record<string, AutocompleteResult[]> = {};

async function fetchAllRecords(
  resourceId: string,
  cacheKey: string,
  nameField: string,
  codeField: string,
  filters?: Record<string, unknown>
): Promise<AutocompleteResult[]> {
  if (cache[cacheKey]) return cache[cacheKey];

  const allRecords: AutocompleteResult[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const params = new URLSearchParams({
      resource_id: resourceId,
      limit: String(limit),
      offset: String(offset),
    });
    if (filters) {
      params.set("filters", JSON.stringify(filters));
    }

    const response = await fetchWithTimeout(`${API_BASE}?${params}`);
    if (!response.ok) {
      throw new Error(`Address lookup failed (${response.status})`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error("Address lookup returned an unsuccessful response");
    }

    if (!data.result?.records?.length) break;

    for (const record of data.result.records) {
      const name = (record[nameField] as string)?.trim();
      const code = record[codeField] as number;
      if (name) allRecords.push({ name, code });
    }

    if (data.result.records.length < limit) break;
    offset += limit;
  }

  cache[cacheKey] = allRecords;
  return allRecords;
}

/** A slow lookup is as bad as a failed one — give up after LOOKUP_TIMEOUT_MS. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a city name to its government city code (סמל_ישוב).
 * Used to unlock the street autocomplete when the city arrives as text
 * (prefilled saved address, or typed fully without picking a suggestion).
 */
export async function findCityCode(name: string): Promise<number | undefined> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return undefined;
  try {
    const cities = await fetchAllRecords(CITIES_RESOURCE_ID, "cities", "שם_ישוב", "סמל_ישוב");
    return cities.find((city) => city.name === trimmed)?.code;
  } catch {
    return undefined;
  }
}

export function AddressAutocomplete({
  type,
  cityCode,
  value,
  onChange,
  placeholder,
  disabled = false,
  onLookupError,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [allItems, setAllItems] = useState<AutocompleteResult[]>([]);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onLookupErrorRef = useRef(onLookupError);

  useEffect(() => {
    onLookupErrorRef.current = onLookupError;
  }, [onLookupError]);

  const reportError = useCallback((failed: boolean) => {
    setHasError(failed);
    onLookupErrorRef.current?.(failed);
  }, []);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Preload data
  useEffect(() => {
    if (type === "city") {
      fetchAllRecords(CITIES_RESOURCE_ID, "cities", "שם_ישוב", "סמל_ישוב")
        .then((records) => {
          setAllItems(records);
          reportError(false);
        })
        .catch((error) => {
          console.warn("City lookup failed — falling back to free text", error);
          setAllItems([]);
          reportError(true);
        });
    }
  }, [type, reportError]);

  useEffect(() => {
    if (type === "street" && cityCode) {
      const key = `streets-${cityCode}`;
      setAllItems([]); // clear while loading
      fetchAllRecords(
        STREETS_RESOURCE_ID,
        key,
        "שם_רחוב",
        "סמל_רחוב",
        { "סמל_ישוב": cityCode }
      )
        .then((records) => {
          setAllItems(records);
          reportError(false);
        })
        .catch((error) => {
          console.warn("Street lookup failed — falling back to free text", error);
          setAllItems([]);
          reportError(true);
        });
    }
  }, [type, cityCode, reportError]);

  // Client-side prefix filter — instant, no API calls
  const filterResults = useCallback(
    (searchQuery: string) => {
      if (searchQuery.length < 1) {
        setResults([]);
        return;
      }

      const q = searchQuery.trim();
      const filtered = allItems
        .filter((item) => item.name.startsWith(q) || item.name.includes(q))
        .sort((a, b) => {
          // Prefer prefix matches over contains matches
          const aStarts = a.name.startsWith(q) ? 0 : 1;
          const bStarts = b.name.startsWith(q) ? 0 : 1;
          return aStarts - bStarts || a.name.localeCompare(b.name);
        })
        .slice(0, 10);

      setResults(filtered);
    },
    [allItems]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setHighlightedIndex(-1);
    filterResults(val);
  };

  const handleSelect = (result: AutocompleteResult) => {
    setQuery(result.name);
    onChange(result.name, result.code);
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when results arrive
  useEffect(() => {
    if (results.length > 0) setIsOpen(true);
  }, [results]);

  const listboxId = `${type}-listbox`;
  const hintId = `${type}-lookup-hint`;
  const isListboxOpen = isOpen && results.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
          else filterResults(query);
        }}
        placeholder={hasError ? "הקלידי את הכתובת" : placeholder}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={isListboxOpen}
        aria-autocomplete="list"
        aria-controls={isListboxOpen ? listboxId : undefined}
        aria-describedby={hasError ? hintId : undefined}
        aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-${highlightedIndex}` : undefined}
      />
      {hasError && (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {type === "city"
            ? "לא הצלחנו לטעון את רשימת הערים — אפשר להקליד את הכתובת ידנית"
            : "לא הצלחנו לטעון את רשימת הרחובות — אפשר להקליד את הכתובת ידנית"}
        </p>
      )}
      {isListboxOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-background border border-border shadow-lg max-h-48 overflow-y-auto"
        >
          {results.map((result, index) => (
            <li
              key={`${result.code}-${result.name}`}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === highlightedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onMouseDown={() => handleSelect(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {result.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
