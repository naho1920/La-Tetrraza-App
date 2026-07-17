"use client";

import { Paperclip } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

interface FileInputProps {
  label?: string;
  accept?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
}

export function FileInput({ label = "Adjuntar archivo", accept, value, onChange }: FileInputProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => ref.current?.click()}>
        <Paperclip className="size-4" data-icon="inline-start" />
        {value ? value.name : label}
      </Button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </>
  );
}
