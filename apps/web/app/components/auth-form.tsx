"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
};

const copy = {
  "sign-in": {
    title: "Sign in to Weppo",
    description: "Continue to your support workspace.",
    submit: "Sign in",
    pending: "Signing in…",
    alternateLabel: "New to Weppo?",
    alternateAction: "Create an account",
    alternateHref: "/sign-up",
  },
  "sign-up": {
    title: "Create your account",
    description: "Start setting up your Weppo workspace.",
    submit: "Create account",
    pending: "Creating account…",
    alternateLabel: "Already have an account?",
    alternateAction: "Sign in",
    alternateHref: "/sign-in",
  },
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<"email" | "google" | null>(
    null,
  );
  const isSignUp = mode === "sign-up";
  const content = copy[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingMethod("email");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: String(formData.get("name") ?? "").trim(),
            email,
            password,
          })
        : await authClient.signIn.email({
            email,
            password,
          });

      if (result.error) {
        setError(
          isSignUp
            ? "We could not create your account. Check your details and try again."
            : "The email or password is incorrect.",
        );
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("We could not reach Weppo. Please try again.");
    } finally {
      setPendingMethod(null);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setPendingMethod("google");

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      });

      if (result.error) {
        setError(
          "Google sign-in is not available yet. Check the OAuth configuration and try again.",
        );
      }
    } catch {
      setError("We could not reach Google sign-in. Please try again.");
    } finally {
      setPendingMethod(null);
    }
  }

  return (
    <main className="min-h-[calc(100svh-72px)] bg-white">
      <div className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-[1440px] items-center justify-center border-x border-border/25 px-5 py-12 sm:px-8">
        <section
          className="mx-auto w-full max-w-[400px]"
          aria-labelledby="auth-title"
        >
        <h1
          id="auth-title"
          className="text-[32px] font-medium leading-[1.12] text-foreground"
        >
          {content.title}
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-text-secondary">
          {content.description}
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={pendingMethod !== null}
          className="mt-10 inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-text-tertiary bg-background px-6 text-sm font-medium text-foreground transition-[border-color,background-color] duration-200 hover:border-foreground hover:bg-[#f7f7f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:text-text-tertiary"
        >
          <Image
            src="/google-logo.png"
            alt=""
            width={18}
            height={18}
            aria-hidden="true"
          />
          {pendingMethod === "google"
            ? "Connecting to Google…"
            : "Continue with Google"}
        </button>

        <div className="my-8 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-text-tertiary/50" />
          <span className="text-xs text-text-tertiary">
            or continue with email
          </span>
          <span className="h-px flex-1 bg-text-tertiary/50" />
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {isSignUp ? (
            <Field
              id="name"
              label="Full name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
            />
          ) : null}

          <Field
            id={`${mode}-email`}
            label="Work email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
          />

          <Field
            id={`${mode}-password`}
            label="Password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="Enter your password"
            minLength={10}
            hint={isSignUp ? "Use at least 10 characters." : undefined}
          />

          {error ? (
            <p
              id="auth-error"
              role="alert"
              className="border-l-2 border-primary bg-primary/10 px-3 py-2.5 text-sm leading-5 text-foreground"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pendingMethod !== null}
            aria-describedby={error ? "auth-error" : undefined}
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors duration-200 hover:bg-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-tertiary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-text-tertiary"
          >
            {pendingMethod === "email" ? content.pending : content.submit}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-text-tertiary">
          {content.alternateLabel}{" "}
          <Link
            href={content.alternateHref}
            className="font-medium text-foreground underline decoration-text-tertiary underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {content.alternateAction}
          </Link>
        </p>
        </section>

      </div>
    </main>
  );
}

type FieldProps = {
  id: string;
  label: string;
  name: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  placeholder: string;
  minLength?: number;
  hint?: string;
};

function Field({
  id,
  label,
  name,
  type,
  autoComplete,
  placeholder,
  minLength,
  hint,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        aria-describedby={hintId}
        className="mt-2 h-12 w-full rounded-lg border border-text-tertiary bg-transparent px-4 text-base text-foreground outline-none transition-colors placeholder:text-text-tertiary focus:border-foreground focus:ring-0"
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
