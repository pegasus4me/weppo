export type IntegrationProvider =
  | "intercom"
  | "sentry"
  | "notion"
  | "postgresql"
  | "github"
  | "zendesk"
  | "datadog"
  | "linear"
  | "jira";

export const integrationLogos = {
  intercom:
    "https://play-lh.googleusercontent.com/eSTxYLsSpc1EO26uX1UQJ8BPXeSa7IFFXAB7fT-GX9AGrg6xGB9wbHa8LV-ANemGuP8XlwbpS0-D0VOkQxo",
  sentry: "https://www.svgrepo.com/show/354332/sentry-icon.svg",
  notion: "https://www.svgrepo.com/show/504667/notion.svg",
  postgresql: "/integrations/postgresql.png",
  github: "/integrations/github.svg",
  zendesk: "/integrations/zendesk.svg",
  datadog: "/integrations/datadog.svg",
  linear: "/integrations/linear.svg",
  jira: "/integrations/jira.svg",
} as const satisfies Record<IntegrationProvider, string>;

export const githubDarkLogo = "/integrations/github-white.png";

export type ConnectableIntegrationProvider = Extract<
  IntegrationProvider,
  "intercom" | "sentry" | "notion"
>;

export type IntercomRegion = "us" | "eu" | "au";

export type IntegrationConnectionStatus =
  | "connected"
  | "disconnected"
  | "pending"
  | "error"
  | "unknown";

export type IntegrationConnection = {
  provider: IntegrationProvider;
  configured: boolean;
  connected: boolean;
  status: IntegrationConnectionStatus;
  accountLabel: string | null;
  accountDomain: string | null;
  scopes: string[];
  updatedAt: string | null;
};

export type IntegrationDefinition = {
  provider: IntegrationProvider;
  name: string;
  logo: string;
  darkLogo?: string;
  description: string;
  available: boolean;
  readOnlyAccess: readonly string[];
};

export type IntegrationGroup = {
  name: string;
  description: string;
  integrations: readonly IntegrationDefinition[];
};

export const integrationGroups: readonly IntegrationGroup[] = [
  {
    name: "Helpdesk",
    description: "Import the original customer conversation and its context.",
    integrations: [
      {
        provider: "intercom",
        name: "Intercom",
        logo: integrationLogos.intercom,
        description:
          "Reconstruct cases from customer conversations, tickets and account context.",
        available: true,
        readOnlyAccess: [
          "Read conversations",
          "Read tickets",
          "Read and list users and companies",
        ],
      },
      {
        provider: "zendesk",
        name: "Zendesk",
        logo: integrationLogos.zendesk,
        description: "Import support tickets and their customer context.",
        available: false,
        readOnlyAccess: [],
      },
    ],
  },
  {
    name: "Observability",
    description: "Let the agent find related errors and technical evidence.",
    integrations: [
      {
        provider: "sentry",
        name: "Sentry",
        logo: integrationLogos.sentry,
        description:
          "Find issues, events and project context related to a customer report.",
        available: true,
        readOnlyAccess: ["org:read", "project:read", "event:read"],
      },
      {
        provider: "datadog",
        name: "Datadog",
        logo: integrationLogos.datadog,
        description: "Search logs, traces and service telemetry.",
        available: false,
        readOnlyAccess: [],
      },
    ],
  },
  {
    name: "Data stores",
    description:
      "Inspect application data through connections restricted to read-only queries.",
    integrations: [
      {
        provider: "postgresql",
        name: "PostgreSQL",
        logo: integrationLogos.postgresql,
        description:
          "Inspect schemas and query relevant records with a restricted database role.",
        available: false,
        readOnlyAccess: [
          "Inspect database schemas",
          "Run SELECT queries only",
          "No insert, update, delete or DDL permissions",
        ],
      },
    ],
  },
  {
    name: "Documentation",
    description:
      "Retrieve trusted technical context from pages explicitly shared with Weppo.",
    integrations: [
      {
        provider: "notion",
        name: "Notion",
        logo: integrationLogos.notion,
        description:
          "Search shared pages and retrieve their content during technical investigations.",
        available: true,
        readOnlyAccess: [
          "Search pages shared with Weppo",
          "Read page properties",
          "Retrieve page content as Markdown",
        ],
      },
    ],
  },
  {
    name: "Engineering",
    description: "Find related bugs and publish validated escalations.",
    integrations: [
      {
        provider: "github",
        name: "GitHub",
        logo: integrationLogos.github,
        darkLogo: githubDarkLogo,
        description:
          "Search repositories, issues, pull requests and commit history for related evidence.",
        available: false,
        readOnlyAccess: [
          "Read repository metadata and source code",
          "Read issues and pull requests",
          "Read commit history",
        ],
      },
      {
        provider: "linear",
        name: "Linear",
        logo: integrationLogos.linear,
        description: "Find related issues and create structured escalations.",
        available: false,
        readOnlyAccess: [],
      },
      {
        provider: "jira",
        name: "Jira",
        logo: integrationLogos.jira,
        description: "Connect investigations with engineering issues.",
        available: false,
        readOnlyAccess: [],
      },
    ],
  },
] as const;
