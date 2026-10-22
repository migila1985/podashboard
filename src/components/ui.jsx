import { useEffect } from "react";

export const inputCls =
  "min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-brand-600 text-white active:bg-brand-500 hover:bg-brand-500",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 md:text-2xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Bottom sheet on small screens, centred dialog from md upward. */
export function Sheet({ open, onClose, title, children, testId }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" data-testid={testId}>
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-xl dark:bg-slate-900 md:max-w-lg md:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-300 md:hidden" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Sluiten" className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export const CategoryDot = ({ color }) => (
  <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: color || "#94a3b8" }} />
);
