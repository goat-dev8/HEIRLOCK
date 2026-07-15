import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkPlus, Brain, Check, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

interface Msg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  latencyMs?: number;
  citations?: Array<{ module: string; path: string; status: string }>;
  thesesSaved?: Array<{ id: string; statement: string }>;
  saving?: boolean;
  saved?: boolean;
}

const SUGGESTIONS = [
  "What matters most in my portfolio right now?",
  "Challenge the current proposal — what would make it wrong?",
  "What changed since yesterday?",
  "Summarise my open theses and their confidence.",
];

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-1"
          style={{ animationDelay: `${i * 0.22}s` }}
        />
      ))}
    </span>
  );
}

export function AiDrawer({
  open,
  onOpenChange,
  seed,
  thesisId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed?: string;
  thesisId?: string;
}) {
  const reduceMotion = useReducedMotion();
  const token = useToken();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seeded = useRef(false);

  const memoryQ = useQuery({
    queryKey: ["fo", "partner", "memory", "active", token],
    queryFn: () =>
      api<{ theses: Array<{ id: string; statement: string; confidence: number }> }>(
        "/api/fo/partner/memory",
        { auth: true, query: { status: "active" } },
      ),
    enabled: !!token,
    staleTime: 30_000,
  });
  const recentTheses = (memoryQ.data?.theses ?? []).slice(0, 2);
  const memoryLabel = recentTheses[0]?.statement
    ? `Remembering: ${recentTheses[0].statement.slice(0, 48)}${recentTheses[0].statement.length > 48 ? "…" : ""}`
    : null;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [msgs, loading, reduceMotion]);

  useEffect(() => {
    if (open && seed && !seeded.current && token) {
      seeded.current = true;
      void send(seed);
    }
    if (!open) {
      seeded.current = false;
      setMsgs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed, token]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => inputRef.current?.focus(), 320);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function send(text: string) {
    if (!text.trim() || !token) {
      if (!token) toast.error("Sign in to talk to your Partner");
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
        thesesSaved?: Array<{ id: string; statement: string }>;
      }>("/api/fo/ai/chat", {
        method: "POST",
        auth: true,
        timeoutMs: 170_000,
        body: { message: text.trim(), thesisId },
      });
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: res.content ?? "Unavailable",
          provider: res.provider ?? res.model,
          latencyMs: res.latencyMs,
          citations: res.citations,
          thesesSaved: res.thesesSaved,
        },
      ]);
    } catch (e) {
      toast.error((e as Error).message || "Partner request failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveAsThesis(index: number) {
    const msg = msgs[index];
    if (!msg || msg.saving || msg.saved) return;
    setMsgs((m) => m.map((x, i) => (i === index ? { ...x, saving: true } : x)));
    try {
      await api("/api/fo/partner/thesis", {
        method: "POST",
        auth: true,
        body: { statement: msg.content.slice(0, 2000), confidence: 55 },
      });
      setMsgs((m) => m.map((x, i) => (i === index ? { ...x, saving: false, saved: true } : x)));
      toast.success("Saved to Investment Memory");
    } catch (e) {
      setMsgs((m) => m.map((x, i) => (i === index ? { ...x, saving: false } : x)));
      toast.error((e as Error).message || "Could not save thesis");
    }
  }

  const panel = (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Close Partner chat"
            className="partner-agent-backdrop fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.28 }}
            onClick={() => onOpenChange(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Partner agent chat"
            className="partner-agent-panel fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[min(88dvh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.35rem] border border-border/60 bg-surface-0/95 shadow-[0_-24px_80px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:bottom-4 sm:rounded-[1.35rem] sm:border"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 48, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 32, scale: reduceMotion ? 1 : 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
          >
            <div className="partner-agent-shine pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-1/50 to-transparent" />

            <header className="border-b border-border/40 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="partner-agent-orb flex h-10 w-10 items-center justify-center rounded-xl border border-accent-1/30 bg-accent-1/10 text-accent-1">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold tracking-tight">Partner</h2>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-muted-foreground">
                      Remembers your theses and decisions, cited from live evidence.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {memoryLabel ? (
                <motion.div
                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-border/50 bg-surface-1/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-accent-1" />
                  <span className="truncate">{memoryLabel}</span>
                </motion.div>
              ) : null}
            </header>

            <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {!token ? (
                <p className="text-[15px] text-muted-foreground">Sign in to talk to your Partner.</p>
              ) : msgs.length === 0 ? (
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
                  }}
                >
                  <p className="text-sm text-muted-foreground">Try a suggestion:</p>
                  <div className="grid gap-2.5">
                    {SUGGESTIONS.map((s) => (
                      <motion.button
                        key={s}
                        type="button"
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                        onClick={() => send(s)}
                        className="partner-agent-suggestion rounded-xl border border-border/50 bg-surface-1/50 p-4 text-left text-[15px] leading-relaxed transition-colors hover:border-accent-1/35 hover:bg-surface-1"
                      >
                        <Sparkles className="mr-2 inline h-4 w-4 text-accent-1" />
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                msgs.map((m, i) => (
                  <motion.div
                    key={`${m.role}-${i}`}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        "max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed " +
                        (m.role === "user"
                          ? "bg-accent-1/15 text-foreground"
                          : "border border-border/50 bg-surface-1/80 text-foreground/90")
                      }
                    >
                      {m.content}
                      {m.citations && m.citations.length > 0 ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {m.citations.map((c) => (
                            <span
                              key={`${c.module}-${c.path}`}
                              className="rounded-md border border-border/50 bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {c.module} · {c.status}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {m.thesesSaved && m.thesesSaved.length > 0 ? (
                        <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-300">
                          <Check className="h-3.5 w-3.5" /> Saved as thesis
                        </div>
                      ) : null}
                      {m.role === "assistant" && (!m.thesesSaved || m.thesesSaved.length === 0) ? (
                        <button
                          type="button"
                          onClick={() => saveAsThesis(i)}
                          disabled={m.saving || m.saved}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent-1 disabled:opacity-60"
                        >
                          {m.saved ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Saved
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-3.5 w-3.5" />
                              {m.saving ? "Saving…" : "Save as thesis"}
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                ))
              )}
              {loading ? (
                <motion.div
                  className="flex items-center gap-2.5 text-[15px] text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ThinkingDots />
                  <span>Partner is thinking</span>
                </motion.div>
              ) : null}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="border-t border-border/40 bg-surface-0/90 p-4 sm:p-5"
            >
              <div className="flex items-end gap-2.5">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="Ask, challenge, or ask me to remember something…"
                  rows={2}
                  className="min-h-[52px] resize-none border-border/50 bg-surface-1 text-[15px] leading-relaxed"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl"
                  disabled={loading || !input.trim() || !token}
                  aria-label="Send message"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={open ? "Close Partner chat" : "Open Partner chat"}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="partner-agent-fab fixed bottom-5 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-1/35 bg-surface-0 text-accent-1 shadow-glow sm:bottom-6 sm:right-6"
        whileHover={reduceMotion ? undefined : { scale: 1.05, y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        animate={
          open
            ? { rotate: 0, scale: 1 }
            : reduceMotion
              ? { scale: 1 }
              : { scale: [1, 1.04, 1] }
        }
        transition={
          open
            ? { type: "spring", stiffness: 400, damping: 28 }
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {open ? <X className="h-5 w-5" /> : <Brain className="h-6 w-6" />}
      </motion.button>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
