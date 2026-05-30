'use client';

import { useState, useEffect } from 'react';

interface NavItem { href: string; label: string; target: string; }

export default function MobileDrawer({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="hatch-hamburger"
        aria-label="Open menu"
        aria-controls="hatch-mobile-drawer"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>
      <div id="hatch-mobile-drawer" className={`hatch-drawer ${open ? 'is-open' : ''}`}>
        {items.map((item) => (
          <a key={item.href + item.label} href={item.href} target={item.target || undefined} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </div>
    </>
  );
}
