import Image from "next/image";

const stats = [
  {
    value: "24/7",
    label: "Always-on triage & investigation",
    description: "Weppo works nights, weekends, and holidays — so your team doesn't have to.",
  },
  {
    value: "85%",
    label: "Faster resolution turnaround",
    description: "Issues arrive pre-investigated. Your team jumps straight to the fix.",
  },
  {
    value: "0",
    label: "Context-rejected escalations",
    description: "Every case includes verified logs, time windows, and reproduction steps.",
  },
  {
    value: "4+",
    label: "Sources correlated per case",
    description: "Connects helpdesks, Sentry, Datadog, databases, and internal docs.",
  },
];

const integrationsList = [
  { name: "Intercom", icon: "/integrations/intercom.svg" },
  { name: "Zendesk", icon: "/integrations/zendesk.svg" },
  { name: "Slack", icon: "/integrations/slack.png" },
  { name: "Datadog", icon: "/integrations/datadog.svg" },
  { name: "Sentry", icon: "/integrations/sentry.svg" },
  { name: "PostgreSQL", icon: "/integrations/postgresql.png" },
  { name: "Linear", icon: "/integrations/linear.svg" },
  { name: "Jira", icon: "/integrations/jira.svg" },
  { name: "Notion", icon: "/integrations/notion.png" },
];

export function SocialProofTrust() {
  return (
    <section className="border-t border-border/25 bg-background px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Integrations Bar */}
        <div className="text-center">
          <p className="text-sm font-medium text-text-secondary">
            Integrates with your existing support and observability stack
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-10">
            {integrationsList.map((tool) => (
              <div
                key={tool.name}
                title={tool.name}
                className="flex items-center justify-center transition-transform hover:scale-110"
              >
                <Image
                  src={tool.icon}
                  alt={tool.name}
                  width={44}
                  height={44}
                  className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Data & Stats Grid */}
        <div className="mt-16 sm:mt-20">
          <div className="text-left mb-8">
            <h2 className="text-2xl font-medium text-foreground sm:text-3xl">
              What happens when your team gets an AI teammate
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border/25 bg-white p-6 shadow-2xs"
              >
                <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {stat.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
