import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KartverketAddress {
  adressetekst: string;
  postnummer: string;
  poststed: string;
  kommunenavn: string;
  representasjonspunkt?: { lat: number; lon: number };
}

interface AddressResult {
  address: string;
  postalCode: string;
  city: string;
  municipality: string;
  lat?: number;
  lon?: number;
  fullDisplay: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Søk adresse...",
  className,
  disabled,
  autoFocus,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suppressRef = useRef(false);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&fuzzy=true&treffPerSide=6&utkoordsys=4258`
      );
      const data = await res.json();
      const results: AddressResult[] = (data.adresser || []).map((a: KartverketAddress) => ({
        address: a.adressetekst,
        postalCode: a.postnummer,
        city: a.poststed,
        municipality: a.kommunenavn,
        lat: a.representasjonspunkt?.lat,
        lon: a.representasjonspunkt?.lon,
        fullDisplay: `${a.adressetekst}, ${a.postnummer} ${a.poststed}`,
      }));
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setHighlightIndex(-1);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: AddressResult) => {
    suppressRef.current = true;
    onChange(result.address);
    onSelect?.(result);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("pr-8", className)}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={`${s.address}-${s.postalCode}-${i}`}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm flex items-start gap-2.5 transition-colors",
                i === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50"
              )}
              onMouseEnter={() => setHighlightIndex(i)}
              onClick={() => handleSelect(s)}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium truncate">{s.address}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.postalCode} {s.city}, {s.municipality}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
