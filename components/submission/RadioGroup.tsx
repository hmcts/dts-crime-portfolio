"use client";

interface RadioOption<V extends string | number> {
  value: V;
  label: string;
  hint?: string;
}

interface RadioGroupProps<V extends string | number> {
  name: string;
  legend: string;
  options: ReadonlyArray<RadioOption<V>>;
  value: V | null;
  onChange: (value: V) => void;
  required?: boolean;
  error?: string;
}

/**
 * Plain radio-group helper used by the tiering questions, project stage,
 * and governance status pickers. Keep deliberately uncomplicated — the
 * submission form is the only place this is used and the spec does not
 * require keyboard arrow nav beyond what the browser already provides.
 */
export function RadioGroup<V extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
  required,
  error,
}: RadioGroupProps<V>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-neutral-800">
        {legend}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </legend>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const id = `${name}-${String(option.value)}`;
          const checked = value === option.value;
          return (
            <label
              key={id}
              htmlFor={id}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition ${
                checked
                  ? "border-blue-400 bg-blue-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="block font-medium text-neutral-800">
                  {option.label}
                </span>
                {option.hint ? (
                  <span className="block text-xs text-neutral-500">
                    {option.hint}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </fieldset>
  );
}
