const discoveryCallUrl = "https://cal.com/safoan/30min";

export function FinalCloser() {
  return (
    <section className="relative overflow-hidden border-t border-border/25 bg-card px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      {/* Background subtle gradient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, hsl(55, 94%, 54%), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-balance text-3xl font-medium leading-tight text-foreground sm:text-5xl lg:text-6xl">
          Give your team an AI teammate that handles the investigation work.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
          Weppo plugs in, triages technical tickets, investigates across your systems, and notifies your engineers — 24/7.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={discoveryCallUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-md bg-foreground px-8 text-base font-medium text-background transition-opacity hover:opacity-85 shadow-sm"
          >
            Book a discovery call
          </a>
          <a
            href={discoveryCallUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-md border border-border/40 bg-white px-6 text-base font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            Request access
          </a>
        </div>
      </div>
    </section>
  );
}
