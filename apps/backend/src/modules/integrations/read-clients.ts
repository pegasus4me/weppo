import { IntegrationFlowError, type IntegrationProvider } from "./domain.js";
import { IntegrationSecretCipher, secretAssociatedData } from "./crypto.js";
import type { IntegrationReadClients, IntegrationRepository } from "./ports.js";
import { intercomHosts, NOTION_API_VERSION } from "./provider-clients.js";
import { fetchProviderJson, safeSentryApiBaseUrl } from "./provider-http.js";
import { INTERCOM_API_VERSION } from "./intercom-config.js";

function pathPart(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return encodeURIComponent(trimmed);
}

async function accessToken(
  repository: IntegrationRepository,
  cipher: IntegrationSecretCipher | undefined,
  workspaceId: string,
  provider: IntegrationProvider,
) {
  const connection = await repository.getConnection(workspaceId, provider);
  if (!connection || !cipher) {
    const providerName =
      provider === "intercom"
        ? "Intercom"
        : provider === "sentry"
          ? "Sentry"
          : "Notion";
    throw new IntegrationFlowError(
      "not_configured",
      `${providerName} is not connected for this workspace.`,
    );
  }
  if (connection.expiresAt && connection.expiresAt.getTime() <= Date.now()) {
    throw new IntegrationFlowError(
      "invalid_grant",
      `The ${provider === "sentry" ? "Sentry" : provider === "notion" ? "Notion" : "Intercom"} connection has expired and must be authorized again.`,
    );
  }
  return {
    connection,
    token: cipher.decrypt(
      connection.encryptedAccessToken,
      secretAssociatedData(workspaceId, provider, "access"),
    ),
  };
}

export function createIntegrationReadClients(
  repository: IntegrationRepository,
  cipher: IntegrationSecretCipher | undefined,
  fetcher: typeof fetch = fetch,
): IntegrationReadClients {
  return {
    intercom: {
      async getConversation(workspaceId, conversationId, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "intercom",
        );
        if (credential.connection.account.provider !== "intercom") {
          throw new Error("Invalid Intercom connection metadata.");
        }
        const base = intercomHosts[credential.connection.account.region].api;
        return fetchProviderJson(
          fetcher,
          `${base}/conversations/${pathPart(conversationId, "Conversation ID")}?display_as=plaintext`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${credential.token}`,
              "intercom-version": INTERCOM_API_VERSION,
            },
          },
          signal,
        );
      },
      async getTicket(workspaceId, ticketId, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "intercom",
        );
        if (credential.connection.account.provider !== "intercom") {
          throw new Error("Invalid Intercom connection metadata.");
        }
        const base = intercomHosts[credential.connection.account.region].api;
        return fetchProviderJson(
          fetcher,
          `${base}/tickets/${pathPart(ticketId, "Ticket ID")}`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${credential.token}`,
              "intercom-version": INTERCOM_API_VERSION,
            },
          },
          signal,
        );
      },
      async getContact(workspaceId, contactId, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "intercom",
        );
        if (credential.connection.account.provider !== "intercom") {
          throw new Error("Invalid Intercom connection metadata.");
        }
        const base = intercomHosts[credential.connection.account.region].api;
        return fetchProviderJson(
          fetcher,
          `${base}/contacts/${pathPart(contactId, "Contact ID")}`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${credential.token}`,
              "intercom-version": INTERCOM_API_VERSION,
            },
          },
          signal,
        );
      },
    },
    sentry: {
      async searchErrorEvents(workspaceId, input, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "sentry",
        );
        if (credential.connection.account.provider !== "sentry") {
          throw new Error("Invalid Sentry connection metadata.");
        }

        const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
        return Promise.all(
          credential.connection.account.organizations.map(
            async (organization) => {
              const base = safeSentryApiBaseUrl(organization.apiBaseUrl);
              const query = new URLSearchParams({
                dataset: "errors",
                query: input.query,
                start: input.start,
                end: input.end,
                per_page: String(limit),
                sort: "-timestamp",
              });
              for (const field of [
                "id",
                "project",
                "timestamp",
                "title",
                "message",
                "issue",
              ]) {
                query.append("field", field);
              }
              const response = await fetchProviderJson(
                fetcher,
                `${base}/api/0/organizations/${pathPart(organization.slug, "Organization slug")}/events/?${query}`,
                {
                  method: "GET",
                  headers: { authorization: `Bearer ${credential.token}` },
                },
                signal,
              );
              const data =
                typeof response === "object" &&
                response !== null &&
                "data" in response &&
                Array.isArray(response.data)
                  ? response.data
                  : [];
              return { organizationSlug: organization.slug, data };
            },
          ),
        );
      },
      async getIssue(workspaceId, organizationSlug, issueId, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "sentry",
        );
        if (credential.connection.account.provider !== "sentry") {
          throw new Error("Invalid Sentry connection metadata.");
        }
        const organization = credential.connection.account.organizations.find(
          (candidate) => candidate.slug === organizationSlug,
        );
        if (!organization) {
          throw new Error("Sentry organization is not connected.");
        }
        const base = safeSentryApiBaseUrl(organization.apiBaseUrl);
        return fetchProviderJson(
          fetcher,
          `${base}/api/0/organizations/${pathPart(organizationSlug, "Organization slug")}/issues/${pathPart(issueId, "Issue ID")}/`,
          {
            method: "GET",
            headers: { authorization: `Bearer ${credential.token}` },
          },
          signal,
        );
      },
      async getIssueEvent(
        workspaceId,
        organizationSlug,
        issueId,
        eventId = "latest",
        signal,
      ) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "sentry",
        );
        if (credential.connection.account.provider !== "sentry") {
          throw new Error("Invalid Sentry connection metadata.");
        }
        const organization = credential.connection.account.organizations.find(
          (candidate) => candidate.slug === organizationSlug,
        );
        if (!organization) {
          throw new Error("Sentry organization is not connected.");
        }
        const base = safeSentryApiBaseUrl(organization.apiBaseUrl);
        return fetchProviderJson(
          fetcher,
          `${base}/api/0/organizations/${pathPart(organizationSlug, "Organization slug")}/issues/${pathPart(issueId, "Issue ID")}/events/${pathPart(eventId, "Event ID")}/`,
          {
            method: "GET",
            headers: { authorization: `Bearer ${credential.token}` },
          },
          signal,
        );
      },
    },
    notion: {
      async searchPages(workspaceId, query, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "notion",
        );
        if (credential.connection.account.provider !== "notion") {
          throw new Error("Invalid Notion connection metadata.");
        }
        const normalizedQuery = query?.trim().slice(0, 200);
        return fetchProviderJson(
          fetcher,
          "https://api.notion.com/v1/search",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${credential.token}`,
              "content-type": "application/json",
              "notion-version": NOTION_API_VERSION,
            },
            body: JSON.stringify({
              page_size: 100,
              filter: { property: "object", value: "page" },
              sort: { direction: "descending", timestamp: "last_edited_time" },
              ...(normalizedQuery ? { query: normalizedQuery } : {}),
            }),
          },
          signal,
        );
      },
      async getPageMarkdown(workspaceId, pageId, signal) {
        const credential = await accessToken(
          repository,
          cipher,
          workspaceId,
          "notion",
        );
        if (credential.connection.account.provider !== "notion") {
          throw new Error("Invalid Notion connection metadata.");
        }
        return fetchProviderJson(
          fetcher,
          `https://api.notion.com/v1/pages/${pathPart(pageId, "Page ID")}/markdown`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${credential.token}`,
              "notion-version": NOTION_API_VERSION,
            },
          },
          signal,
        );
      },
    },
  };
}
