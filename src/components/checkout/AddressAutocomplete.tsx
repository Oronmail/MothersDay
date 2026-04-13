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
}

const CITIES_RESOURCE_ID = "b7cf8f14-64a2-4b33-8d4b-edb286fdbd37";
const STREETS_RESOURCE_ID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";
const API_BASE = "https://data.gov.il/api/3/action/datastore_search";

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

    const response = await fetch(`${API_BASE}?${params}`);
    const data = await response.json();

    if (!data.success || !data.result?.records?.length) break;

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

export function AddressAutocomplete({
  type,
  cityCode,
  value,
  onChange,
  placeholder,
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [allItems, setAllItems] = useState<AutocompleteResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Preload data
  useEffect(() => {
    if (type === "city") {
      fetchAllRecords(CITIES_RESOURCE_ID, "cities", "שם_ישוב", "סמל_ישוב").then(
        setAllItems
      );
    }
  }, [type]);

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
      ).then(setAllItems);
    }
  }, [type, cityCode]);

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
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-background border border-border shadow-lg max-h-48 overflow-y-auto">
          {results.map((result, index) => (
            <li
              key={`${result.code}-${result.name}`}
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
