export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <section className="max-w-xl text-center">
        <p className="text-sm font-medium uppercase text-muted-foreground">
          Weppo app
        </p>
        <h1 className="mt-4 font-crimson-text text-5xl font-light leading-none text-foreground md:text-6xl">
          App workspace coming soon.
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          The landing page now lives in the dedicated landing app. This surface
          is ready for the product experience when we build it.
        </p>
      </section>
    </main>
  );
}
