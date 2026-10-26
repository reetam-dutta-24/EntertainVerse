"use client";

import { Field, inputClass } from "@/components/admin/catalog-nested-fields";

interface EnumOption {
  value: string;
  label: string;
}

export function EnumSelect({
  label,
  hint,
  value,
  options,
  onChange,
  allowEmpty = true,
  emptyLabel = "None",
}: {
  label: string;
  hint?: string;
  value: string;
  options: readonly EnumOption[];
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty ? (
          <option value="" className="bg-popover text-white">
            {emptyLabel}
          </option>
        ) : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-popover text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function EnumMultiSelect({
  label,
  hint,
  values,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  options: readonly EnumOption[];
  onChange: (values: string[]) => void;
}) {
  const available = options.filter((o) => !values.includes(o.value));

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <select
          aria-label={label}
          className={`${inputClass} min-w-0 flex-1`}
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v && !values.includes(v)) onChange([...values, v]);
          }}
        >
          <option value="" className="bg-popover text-white">
            Select…
          </option>
          {available.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-popover text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => {
            const opt = options.find((o) => o.value === value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-red-500/20"
              >
                {opt?.label ?? value} ×
              </button>
            );
          })}
        </div>
      ) : null}
    </Field>
  );
}
