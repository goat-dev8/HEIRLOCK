import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Brain, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  latencyMs?: number;
  citations?: Array<{ module: string; path: string; status: string }>;
}

const SUGGESTIONS = [
  "Summarise current BTC ETF flows.",
  "What macro events matter this week?",
  "Where is ssiMAG7 weight concentrated?",
  "Draft a short Alive-mode risk memo.",
];

export function AiDrawer({
  open,
  onOpenChange,
  seed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed?: string;
}) {
  const token = useToken();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    if (open && seed && !seeded.current && token) {
      seeded.current = true;
      void send(seed);
    }
    if (!open) seeded.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed, token]);

  async function send(text: string) {
    if (!text.trim() || !token) {
      if (!token) toast.error("Sign in to ask the Family Office AI");
      return;
    }
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text.trim() }]);
    setLoading(true);
    try {
      const res = await api<{
        content?: string;
        provider?: string;
        model?: string;
        latencyMs?: number;
        citations?: Array<{ module: string; path: string; status: string }>;
      }>("/api/fo/ai/chat", {
        method: "POST",
        auth: true,
        timeoutMs: 90_000,
        body: { message: text.trim() },
      });
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: res.content ?? "Unavailable",
          provider: res.provider ?? res.model,
          latencyMs: res.latencyMs,
          citations: res.citations,
        },
      ]);
    } catch (e) {
      toast.error((e as Error).message || "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-border/50 bg-surface-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-surface-2 text-accent-1">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="font-display text-base">Ask AI</SheetTitle>
              <SheetDescription className="text-xs">
                Cited answers from live SoSoValue Terminal context.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {!token ? (
            <p className="text-sm text-muted-foreground">Sign in to use Family Office AI.</p>
          ) : msgs.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Try a suggestion:</p>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border border-border/60 bg-surface-1/60 p-3 text-left text-sm transition-colors hover:border-accent-1/40 hover:bg-surface-2"
                  >
                    <Sparkles className="mr-2 inline h-3.5 w-3.5 text-accent-1" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    "max-w-[92%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed " +
                    (m.role === "user"
                      ? "bg-accent-1/15 text-foreground"
                      : "border border-border/50 bg-surface-1 text-foreground/90")
                  }
                >
                  {m.content}
                  {m.citations && m.citations.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.citations.map((c) => (
                        <span
                          key={`${c.module}-${c.path}`}
                          className="rounded border border-border/50 bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                        >
                          {c.module}:{c.status}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2 border-t border-border/40 p-3"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask about evidence, risk, or SSI…"
            className="min-h-11 resize-none border-border/60 bg-surface-1"
          />
          <Button type="submit" disabled={loading || !input.trim() || !token}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
