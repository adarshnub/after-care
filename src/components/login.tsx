"use client";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/client";
import type { Role } from "@/lib/types";
import { Brand, Spinner } from "./ui";
export function LoginScreen({
  allowDemo,
  onLogin,
}: {
  allowDemo: boolean;
  onLogin: () => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { email, password });
      await onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo(role: Role) {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/demo", { role });
      await onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <section className="login-story">
        <Brand />
        <div>
          <span className="login-heart">
            <HeartHandshake size={38} />
          </span>
          <h1>
            Your recovery,
            <br />
            together.
          </h1>
          <p>
            A clear plan. A little reassurance.
            <br />
            The right support, one day at a time.
          </p>
        </div>
        <p className="login-story-note">A little care. Every day.</p>
      </section>
      <section className="login-form-region">
        <div className="login-form-box">
          <div className="mobile-login-brand">
            <Brand />
          </div>
          <h2>A little support starts here.</h2>
          <p>Sign in with the credentials given to you by your hospital.</p>
          <form onSubmit={login}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <div className="password-input">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={200}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your hospital-issued password"
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <button className="button login-submit" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="login-help">
            Need help with your credentials? Contact your hospital’s discharge
            team.
          </p>
          {allowDemo && (
            <div className="demo-login">
              <span>Explore with fictional demo data</span>
              <div>
                <button disabled={busy} onClick={() => demo("patient")}>
                  Patient
                </button>
                <button disabled={busy} onClick={() => demo("caregiver")}>
                  Caregiver
                </button>
                <button disabled={busy} onClick={() => demo("nurse")}>
                  Nurse
                </button>
              </div>
            </div>
          )}
          <p className="login-security">
            <ShieldCheck size={16} />
            Your care plan is personal. Keep your credentials private.
          </p>
        </div>
      </section>
    </main>
  );
}
