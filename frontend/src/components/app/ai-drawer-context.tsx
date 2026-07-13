import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { AiDrawer } from "@/components/app/ai-drawer";

type AiUi = {
  open: boolean;
  seed?: string;
  openAi: (seed?: string) => void;
  closeAi: () => void;
};

const Ctx = createContext<AiUi | null>(null);

export function AiDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<string | undefined>();

  const value = useMemo<AiUi>(
    () => ({
      open,
      seed,
      openAi: (nextSeed?: string) => {
        setSeed(nextSeed);
        setOpen(true);
      },
      closeAi: () => setOpen(false),
    }),
    [open, seed],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <AiDrawer
        open={open}
        seed={seed}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSeed(undefined);
        }}
      />
    </Ctx.Provider>
  );
}

export function useAiDrawer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAiDrawer must be used within AiDrawerProvider");
  return ctx;
}
