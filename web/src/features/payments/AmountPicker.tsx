import { useId, useState } from "react";
import { Field, Input } from "../../components/ui/Field.tsx";
import { cn } from "../../lib/cn.ts";
import { formatMoney } from "../../lib/format-money.ts";
import type { Cents } from "../../types/api.ts";
import { checkAmount } from "./amount.ts";

// Preset chips + a custom amount, all in integer cents (decision 6). Not in the prototypes
// (13 had a fixed unlock price); styled like the 07D radio chips. Reusable for bounty rewards.

export interface AmountPickerProps {
  presets: readonly Cents[];
  min: Cents;
  max: Cents;
  /** The chosen amount, or null while the custom input is empty or invalid. */
  value: Cents | null;
  onChange: (amount: Cents | null) => void;
  disabled?: boolean;
  label?: string;
}

export function AmountPicker({ presets, min, max, value, onChange, disabled, label = "Amount" }: AmountPickerProps) {
  const groupId = useId();
  const [custom, setCustom] = useState("");
  const [customActive, setCustomActive] = useState(value !== null && !presets.includes(value));
  const { error } = checkAmount(custom, min, max);

  function pickPreset(amount: Cents) {
    setCustomActive(false);
    setCustom("");
    onChange(amount);
  }

  function typeCustom(input: string) {
    setCustomActive(true);
    setCustom(input);
    onChange(checkAmount(input, min, max).cents);
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-labelledby={`${groupId}-label`} className="flex flex-col gap-2">
        <span id={`${groupId}-label`} className="text-12 font-semibold text-fg-secondary">
          {label}
        </span>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((amount) => {
            const selected = !customActive && value === amount;
            return (
              <button
                key={amount}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => pickPreset(amount)}
                className={cn(
                  "cursor-pointer rounded-md border px-2 py-2.5 font-display text-15 font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                  selected
                    ? "border-primary bg-primary/14 text-fg"
                    : "border-border bg-inset text-fg-secondary hover:not-disabled:border-border-light hover:not-disabled:text-fg",
                )}
              >
                {formatMoney(amount).replace(/\.00$/, "")}
              </button>
            );
          })}
        </div>
      </div>
      <Field
        label="Or enter an amount (USD)"
        error={customActive ? error : null}
        hint={`Between ${formatMoney(min)} and ${formatMoney(max)}.`}
      >
        <Input
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 15.00"
          value={custom}
          disabled={disabled}
          leading={<span className="text-13 font-semibold">$</span>}
          onChange={(event) => typeCustom(event.target.value)}
        />
      </Field>
    </div>
  );
}
