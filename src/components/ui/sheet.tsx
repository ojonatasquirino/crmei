"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Sheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <D.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 pb-8 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong sm:hidden" />
          <div className="mb-4 flex items-center justify-between">
            <D.Title className="text-base font-semibold">{title}</D.Title>
            <D.Close className="rounded-md p-2 text-muted hover:bg-surface-2" aria-label="Fechar"><X className="size-4" /></D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
