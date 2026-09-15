// Small handcrafted UI kit — paper-cut cards, tactile buttons, badges.
// Deliberately not a generic SaaS look: irregular radii + offset shadows.

import React from "react";

type Div = React.HTMLAttributes<HTMLDivElement>;

export function Paper({ className = "", children, ...rest }: Div) {
  return (
    <div className={`rounded-[18px_15px_22px_13px] border-2 border-[#fff9ec]/65 bg-cream text-ink shadow-[8px_9px_0_#0005] ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Button({
  className = "", children, variant = "solid", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-[14px_11px_16px_10px] px-4 py-2 font-black transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint";
  const look = variant === "ghost" ? "bg-transparent text-[#a7a0b0] hover:text-white" : "shadow-[4px_5px_0_#282239] hover:-translate-y-0.5";
  return <button className={`${base} ${look} ${className}`} {...rest}>{children}</button>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-12 w-full rounded-xl border-2 border-ink/15 bg-white/70 px-3 text-ink placeholder:text-ink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-grape ${props.className ?? ""}`} />;
}

export function Badge({ className = "", children }: Div) {
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black ${className}`}>{children}</span>;
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="text-sm font-bold text-ink/80">{children}</label>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-mint transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export const initials = (n: string) =>
  n.trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "?";

export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="max-w-lg w-full"> 
        <Paper className="p-4"> 
          <div>
            {children}
          </div>
          <button aria-label="close" onClick={onClose} className="sr-only">Close</button>
        </Paper>
      </div>
    </div>
  );
}
