import { PasswordInput } from "@/components/ui/PasswordInput";
import { PhoneInput } from "@/components/ui/PhoneInput";

export function FormField({
  id,
  name,
  label,
  type = "text",
  required,
  autoComplete,
  minLength,
  placeholder,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {type === "password" ? (
        <PasswordInput
          id={id}
          name={name}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          className="input"
        />
      ) : type === "tel" ? (
        <PhoneInput id={id} name={name} required={required} autoComplete={autoComplete} />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          className="input"
        />
      )}
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}
