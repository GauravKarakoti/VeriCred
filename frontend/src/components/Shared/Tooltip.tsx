import type { ReactNode } from 'react';

export default function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return <span className="group relative inline-flex">
    {children}
    <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg border border-midnight-line bg-[#080d18] px-3 py-2 text-center text-[11px] leading-relaxed text-slate-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{content}</span>
  </span>;
}
