"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Pill,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { CareRecord } from "@/lib/types";
import { api, initials } from "@/lib/client";
import { Spinner } from "./ui";
type Message = { role: "assistant" | "user"; text: string; source?: string };
export function CareAssistant({
  record,
  initialPrompt,
  configured,
}: {
  record: CareRecord;
  initialPrompt?: string;
  configured: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null),
    sentInitial = useRef(false);
  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { role: "user", text }]);
    try {
      const value = await api<{ answer: string; source: string }>(
        "/api/assistant",
        { recordId: record.id, message: text },
      );
      setMessages((current) => [
        ...current,
        { role: "assistant", text: value.answer, source: value.source },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialPrompt);
    }
  }, [initialPrompt]); // The prompt is sent once when this screen opens.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);
  return (
    <section className="panel chat-panel">
      <div className="chat-intro">
        <span className="sparkle-circle large">
          <Sparkles size={30} />
        </span>
        <h2>A little clarity. A little reassurance.</h2>
        <p>
          I can help you find your next step and understand the instructions in
          your care plan.
        </p>
        <span className={`assistant-mode ${configured ? "" : "demo-mode"}`}>
          {configured
            ? "AI assistant · Based on your reviewed care plan"
            : "Plan guide · AI not connected yet"}
        </span>
      </div>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, i) => (
          <div key={i} className={`chat-message ${message.role}`}>
            <span className={`avatar ${message.role === "user" ? "" : "sage"}`}>
              {message.role === "user" ? (
                initials(record.name)
              ) : (
                <Sparkles size={18} />
              )}
            </span>
            <div>
              <div className="chat-bubble">{message.text}</div>
              {message.role === "assistant" && (
                <small className="message-source">
                  {message.source === "ai"
                    ? "From your care assistant"
                    : message.source === "safety"
                      ? "Urgent care guidance"
                      : "From your recorded care plan"}
                </small>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="chat-message assistant">
            <span className="avatar sage">
              <Sparkles size={18} />
            </span>
            <div className="chat-bubble typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>
      {!messages.length && (
        <div className="chat-suggestions">
          {[
            { icon: ArrowRight, text: "What’s my next step?" },
            { icon: Pill, text: "Help with my medications" },
            { icon: CalendarDays, text: "When is my next appointment?" },
          ].map(({ icon: Icon, text }) => (
            <button key={text} onClick={() => send(text)}>
              <Icon size={20} />
              <span>{text}</span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="sr-only" htmlFor="chat-question">
          Ask about your care plan
        </label>
        <input
          id="chat-question"
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What’s on your mind?"
          disabled={busy}
        />
        <button
          className="button"
          aria-label="Send message"
          disabled={busy || !input.trim()}
        >
          {busy ? <Spinner /> : <Send size={19} />}
        </button>
      </form>
      <p className="chat-disclaimer">
        <ShieldCheck size={14} />
        Your assistant is a guide to your plan. For symptoms or treatment
        changes, contact your care team.
      </p>
    </section>
  );
}
