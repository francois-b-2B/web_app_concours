"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Input } from "./input";

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className="pr-20" {...props} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-medium text-muted hover:text-foreground"
      >
        {visible ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}
