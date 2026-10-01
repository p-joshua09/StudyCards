"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, BrainCircuit, LoaderCircle, ShieldCheck } from "lucide-react";
import { signInAction, signUpAction, type AuthActionState } from "./actions";

type AuthFormProps = {
  mode: "login" | "register";
  configured: boolean;
  message?: string;
};

const initialState: AuthActionState = {};

export function AuthForm({ mode, configured, message }: AuthFormProps) {
  const isRegister = mode === "register";
  const actionFunction = isRegister ? signUpAction : signInAction;
  const [state, action, pending] = useActionState(actionFunction, initialState);

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <Link className="auth-brand" href="/">
          <span className="brand-mark"><BrainCircuit size={21} aria-hidden="true" /></span>
          <span><strong>StudyCards</strong><small>Learn with intention</small></span>
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">Your study space</p>
          <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p>{isRegister ? "Save your decks and keep your study streak going." : "Sign in to pick up where your last review ended."}</p>
        </div>

        {!configured ? (
          <div className="auth-config-note" role="status">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Account access is ready to connect. Add your Supabase project keys to enable it; the app currently opens in demo mode.</span>
          </div>
        ) : null}

        {message ? <p className="auth-message" role="status">{message}</p> : null}

        <form action={action} className="auth-form">
          {isRegister ? (
            <label className="auth-field">
              <span>Your name</span>
              <input name="displayName" type="text" autoComplete="name" placeholder="Jamie Davis" minLength={2} maxLength={80} required />
            </label>
          ) : null}
          <label className="auth-field">
            <span>Email address</span>
            <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder="At least 8 characters" minLength={8} required />
          </label>
          {state.error ? <p className="auth-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="auth-success" role="status">{state.success}</p> : null}
          <button className="button button-primary auth-submit" type="submit" disabled={pending}>
            {pending ? <LoaderCircle size={17} className="spinner" /> : null}
            {pending ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            {!pending ? <ArrowRight size={17} aria-hidden="true" /> : null}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Already have an account? " : "New to StudyCards? "}
          <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link>
        </p>
        <p className="auth-privacy"><ShieldCheck size={14} aria-hidden="true" /> Your study materials stay private to your account.</p>
      </section>
    </main>
  );
}
