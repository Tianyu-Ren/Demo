"use client";

import { createPortal } from "react-dom";

export default function LogoOverlay() {
  if (typeof window === "undefined") return null;

  return createPortal(
    <a href="/">
      <img
        src="/logo.png"
        alt="Logo"
        className="fixed top-2 left-4 w-56 h-56 object-contain z-[9999] cursor-pointer"
      />
    </a>,
    document.body
  );
}