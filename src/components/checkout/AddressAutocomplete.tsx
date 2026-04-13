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
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchResults = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      if (type === "street" && !cityCode) {
        setResults([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          resource_id: type === "city" ? CITIES_RESOURCE_ID : STREETS_RESOURCE_ID,
          q: searchQuery,
          limit: "10",
        });

        if (type === "street" && cityCode) {
          params.set("filters", JSON.stringify({ "סמל_ישוב": cityCode }));
        }

        const response = await fetch(`${API_BASE}?${params}`);
        const data = await response.json();

        if (data.success && data.result?.records) {
          const mapped: AutocompleteResult[] = data.result.records.map(
            (record: Record<string, unknown>) => {
              if (type === "city") {
                return {
                  name: (record["שם_ישוב"] as string)?.trim(),
                  code: record["סמל_ישוב"] as number,
                };
              }
              return {
                name: (record["שם_רחוב"] as string)?.trim(),
                code: record["סמל_רחוב"] as number,
              };
            }
          );
          setResults(mapped.filter((r) => r.name));
        }
      } catch {
        setResults([]);
      }
    },
    [type, cityCode]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // update parent with raw text (no code = not selected from list)
    setHighlightedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 300);
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
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
