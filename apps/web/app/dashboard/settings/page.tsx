export default function SettingsPage() {
  return (
    <main className="min-h-full px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-sm text-text-tertiary">Workspace</p>
        <h1 className="mt-1 text-[30px] font-medium leading-tight text-foreground">
          Settings
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Manage the workspace used for technical investigations.
        </p>

        <div className="mt-9 divide-y divide-border/20 border-y border-border/20">
          <section className="grid gap-4 py-6 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <h2 className="text-sm font-medium text-foreground">Workspace name</h2>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">
                Displayed across Weppo.
              </p>
            </div>
            <input
              type="text"
              defaultValue="Safoan Touil workspace"
              className="h-11 w-full rounded-md border border-border/40 bg-white px-3.5 text-sm text-foreground outline-none focus:border-foreground"
            />
          </section>

          <section className="grid gap-4 py-6 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <h2 className="text-sm font-medium text-foreground">Data access</h2>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">
                Default policy for connected tools.
              </p>
            </div>
            <div className="rounded-md border border-border/25 px-4 py-3.5">
              <p className="text-sm font-medium text-foreground">Read-only</p>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">
                Weppo can inspect evidence but cannot modify customer systems.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-white transition-colors hover:bg-text-secondary"
          >
            Save changes
          </button>
        </div>
      </div>
    </main>
  );
}
