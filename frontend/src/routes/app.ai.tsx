import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useToken } from "@/lib/auth-store";
import { RequireAuth } from "@/components/app/require-auth";
import { Panel } from "@/components/app/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiHealth } from "@/lib/api-hooks";
import { Brain, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai")({
  head: () => ({ meta: [{ title: "Family Office AI — HEIRLOCK" }, { name: "robots", content: "noindex" }] }),
  component: AiPage,
});

interface Msg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  latencyMs?: number;
  citations?: Array<{ module: string; path: string; status: string }>;
}

const SUGGESTIONS = [
  "Summarise current BTC ETF flows and inflow concentration.",
  "What macro events this week could affect crypto beta?",
  "Given SSI constituents, where is index weight concentrated?",
  "Draft a 3-line risk memo for a conservative Alive-mode portfolio.",
];

function AiPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Family Office AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tool-cited answers from live SoSoValue Terminal context under the Family Office Skill.
        </p>
      </div>
      <RequireAuth>
        <Chat />
      </RequireAuth>
    </div>
  );
}

function Chat() {
  const token = useToken();
  const { data: health } = useAiHealth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    if (!text.trim() || !token) return;
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
      const reply = res.content ?? "Unavailable";
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: reply,
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
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-surface-2 text-accent-1">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-[13px] font-medium">AI Family Office</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Cited Terminal · {health?.circuit ?? "healthy"}
            </div>
          </div>
        </div>
      </div>

      <div ref={scroller} className="max-h-[52vh] min-h-[300px] space-y-4 overflow-y-auto px-5 py-6">
        {msgs.length === 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Start with a prompt, or pick a suggestion:</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border/60 bg-surface-0 p-3 text-left text-sm text-foreground/90 transition-colors hover:border-accent-1/40 hover:bg-surface-2"
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
                  "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed " +
                  (m.role === "user"
                    ? "bg-accent-1/15 text-foreground"
                    : "border border-border/50 bg-surface-0 text-foreground/90")
                }
              >
                {m.content}
                {m.role === "assistant" && m.citations && m.citations.length > 0 ? (
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
                {m.role === "assistant" && m.latencyMs != null ? (
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {m.provider ?? "AI"} · {m.latencyMs}ms
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-border/50 p-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask the family office AI…"
          className="min-h-11 resize-none border-border/60 bg-surface-0"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Panel>
  );
}
