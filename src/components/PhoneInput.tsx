import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { COUNTRY_DIAL_CODES, getCountryByIso } from "@/lib/countryDialCodes";
import { composePhone, formatNationalInput, parsePhoneParts } from "@/lib/phone";
import { useTranslation } from "@/i18n/LanguageContext";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  defaultCountry?: string;
};

export function PhoneInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  required,
  defaultCountry = "BR",
}: PhoneInputProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const lastEmitted = useRef(value);

  const initial = parsePhoneParts(value, defaultCountry);
  const [countryIso, setCountryIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    const parsed = parsePhoneParts(value, defaultCountry);
    setCountryIso(parsed.iso);
    setNational(parsed.national);
    lastEmitted.current = value;
  }, [value, defaultCountry]);

  const country = getCountryByIso(countryIso) ?? getCountryByIso(defaultCountry)!;

  const nationalPlaceholder =
    placeholder ??
    (countryIso === "BR"
      ? t("phone.nationalPlaceholderBr")
      : t("phone.nationalPlaceholderIntl"));

  const emitChange = (iso: string, nationalValue: string) => {
    const formatted = formatNationalInput(iso, nationalValue);
    const composed = composePhone(iso, formatted);
    lastEmitted.current = composed;
    onChange(composed);
    return formatted;
  };

  const setCountry = (iso: string) => {
    setCountryIso(iso);
    const formatted = emitChange(iso, national);
    setNational(formatted);
    setOpen(false);
  };

  const setNationalValue = (raw: string) => {
    const formatted = formatNationalInput(countryIso, raw);
    setNational(formatted);
    const composed = composePhone(countryIso, formatted);
    lastEmitted.current = composed;
    onChange(composed);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-11 shrink-0 gap-1.5 px-2.5 rounded-xl border-0 bg-input/60 font-normal",
              inputClassName,
            )}
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span className="text-sm tabular-nums">+{country.dial}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("phone.searchCountry")} />
            <CommandList>
              <CommandEmpty>{t("phone.noCountry")}</CommandEmpty>
              <CommandGroup>
                {COUNTRY_DIAL_CODES.map((c) => (
                  <CommandItem
                    key={c.iso}
                    value={`${c.name} ${c.iso} +${c.dial}`}
                    onSelect={() => setCountry(c.iso)}
                    className="gap-2"
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">+{c.dial}</span>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        countryIso === c.iso ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        type="tel"
        inputMode="tel"
        value={national}
        onChange={(e) => setNationalValue(e.target.value)}
        placeholder={nationalPlaceholder}
        required={required}
        className={cn("flex-1 h-11 rounded-xl border-0 bg-input/60", inputClassName)}
      />
    </div>
  );
}
