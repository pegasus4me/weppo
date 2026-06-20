"use client";

import { useEffect, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";
import { ShimmerButton } from "@/components/ui/shimmer-button";

type ApplyPilotDialogProps = {
  className?: string;
  label?: string;
  variant?: "header" | "shimmer";
};

export function ApplyPilotDialog({
  className,
  label = "Apply for early pilot",
  variant = "shimmer",
}: ApplyPilotDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    audienceSize: "",
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const closeDialog = () => {
    setIsOpen(false);
    setIsSubmitted(false);
    setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/pilot-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Application could not be submitted.");
      }

      setIsSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const trigger =
    variant === "header" ? (
      <button
        className={cn(
          "rounded-full bg-secondary px-4 py-2 text-lg text-black transition-opacity hover:opacity-70",
          className,
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {label}
      </button>
    ) : (
      <ShimmerButton
        background="var(--primary)"
        className={cn("px-8 py-3 text-sm font-semibold text-white", className)}
        onClick={() => setIsOpen(true)}
        shimmerColor="var(--color-text)"
        type="button"
      >
        {label}
      </ShimmerButton>
    );

  return (
    <>
      {trigger}

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          onClick={closeDialog}
        >
          <div
            aria-labelledby="apply-pilot-title"
            aria-modal="true"
            className="w-full max-w-xl rounded-[2rem] bg-background p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="relative">
              <div className="mx-auto max-w-md text-center">
                <h3
                  className="font-crimson-text text-3xl leading-tight text-foreground"
                  id="apply-pilot-title"
                >
                  Tell us a bit about you.
                </h3>
              </div>
              <button
                aria-label="Close dialog"
                className="absolute right-0 top-0 text-2xl leading-none text-muted-foreground transition-opacity hover:opacity-70"
                onClick={closeDialog}
                type="button"
              >
                ×
              </button>
            </div>

            {isSubmitted ? (
              <div className="mt-8">
                <p className="font-crimson-text text-2xl text-foreground">
                  Thanks, {formData.name || "there"}.
                </p>
                <p className="mt-3 text-base text-center leading-8 text-muted-foreground">
                  We have your details and will personally reach out at{" "}
                  {formData.email} for the pilot stage.
                </p>
                <button
                  className="mt-8 rounded-full bg-primary text-white px-6 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-80"
                  onClick={closeDialog}
                  type="button"
                >
                  Close
                </button>
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block text-left">
                  <span className="mb-2 block text-sm font-medium text-foreground">
                    Name
                  </span>
                  <input
                    className="w-full rounded-[1.25rem] bg-secondary px-5 py-4 text-base text-foreground outline-none ring-0 placeholder:text-muted-foreground"
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Your name"
                    required
                    type="text"
                    value={formData.name}
                  />
                </label>

                <label className="block text-left">
                  <span className="mb-2 block text-sm font-medium text-foreground">
                    Email
                  </span>
                  <input
                    className="w-full rounded-[1.25rem] bg-secondary px-5 py-4 text-base text-foreground outline-none ring-0 placeholder:text-muted-foreground"
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={formData.email}
                  />
                </label>

                <label className="block text-left">
                  <span className="mb-2 block text-sm font-medium text-foreground">
                    How many clients, students, or members do you support today?
                  </span>
                  <select
                    className="w-full rounded-[1.25rem] bg-secondary px-5 py-4 text-base text-foreground outline-none ring-0"
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        audienceSize: event.target.value,
                      }))
                    }
                    required
                    value={formData.audienceSize}
                  >
                    <option value="" disabled>
                      Select a range
                    </option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201+">201+</option>
                  </select>
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                  <button
                    className="w-full rounded-full bg-primary text-white px-6 py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Submitting..." : "Submit application"}
                  </button>
                </div>
                {submitError ? (
                  <p
                    aria-live="polite"
                    className="text-center text-sm text-destructive"
                  >
                    {submitError}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
