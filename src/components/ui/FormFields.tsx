import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, Check } from "lucide-react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";

// ─── Base field wrapper ───────────────────────────────────────────
interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  required,
  error,
  hint,
  id,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 select-none">
          {label}
          {required && <span className="text-orange-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Info size={11} />
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Shared input classes ─────────────────────────────────────────
const baseInputCls = [
  "w-full rounded-md border bg-white text-sm text-slate-900",
  "placeholder:text-slate-400",
  "transition-colors duration-150",
  "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 focus:border-orange-400",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
].join(" ");

const stateInputCls = (error?: string) =>
  error ? "border-red-400 bg-red-50/50" : "border-slate-200 hover:border-slate-300";

// ─── Input ────────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Show a green checkmark when value is valid */
  isValid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, hint, leadingIcon, trailingIcon, isValid, id, required, ...props },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <FieldWrapper label={label} required={required} error={error} hint={hint} id={inputId}>
        <div className="relative">
          {leadingIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              {leadingIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={cn(
              baseInputCls,
              stateInputCls(error),
              "h-9 px-3 py-1.5",
              leadingIcon && "pl-9",
              (trailingIcon || isValid) && "pr-9",
              className
            )}
            {...props}
          />
          {isValid && !trailingIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
              <CheckCircle2 size={15} />
            </div>
          )}
          {trailingIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              {trailingIcon}
            </div>
          )}
        </div>
      </FieldWrapper>
    );
  }
);
Input.displayName = "Input";

// ─── Textarea ─────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <FieldWrapper label={label} required={required} error={error} hint={hint} id={inputId}>
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            baseInputCls,
            stateInputCls(error),
            "min-h-[80px] px-3 py-2 resize-none",
            className
          )}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Textarea.displayName = "Textarea";

// ─── Select ───────────────────────────────────────────────────────
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, required, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <FieldWrapper label={label} required={required} error={error} hint={hint} id={inputId}>
        <select
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            baseInputCls,
            stateInputCls(error),
            "h-9 px-3 py-1.5 cursor-pointer appearance-none",
            "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.75rem_center]",
            "pr-8",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldWrapper>
    );
  }
);
Select.displayName = "Select";

// ─── Checkbox ─────────────────────────────────────────────────────
export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, description, id, ...props }, ref) => {
  const checkId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className="flex items-start gap-2.5">
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkId}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded border border-slate-300 bg-white ring-offset-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white",
          "transition-colors duration-150 cursor-pointer mt-0.5",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
          <Check className="h-3 w-3 stroke-[3]" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <div className="grid gap-0.5 leading-none select-none">
          {label && (
            <label
              htmlFor={checkId}
              className="text-xs font-medium text-slate-700 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-slate-400">{description}</p>
          )}
        </div>
      )}
    </div>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// ─── Switch ───────────────────────────────────────────────────────
export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, description, id, ...props }, ref) => {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div className="flex flex-col gap-0.5 select-none">
          {label && (
            <label
              htmlFor={switchId}
              className="text-xs font-medium text-slate-700 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-slate-400">{description}</p>
          )}
        </div>
      )}
      <SwitchPrimitive.Root
        ref={ref}
        id={switchId}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-slate-200",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition-transform",
            "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
});
Switch.displayName = SwitchPrimitive.Root.displayName;

