import { NewInvestigationForm } from "@/features/investigations/components/new-investigation-form";

export default function NewInvestigationPage() {
  return (
    <main className="min-h-full px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-text-tertiary">Investigations</p>
        <h1 className="mt-1 text-[30px] font-medium leading-tight text-foreground">
          New investigation
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Give Weppo the customer report that should be reconstructed.
        </p>

        <NewInvestigationForm />
      </div>
    </main>
  );
}
