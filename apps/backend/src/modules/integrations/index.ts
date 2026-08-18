import type pg from "pg";

import type { IntegrationOAuthConfig } from "../../config/env.js";
import { IntegrationSecretCipher } from "./crypto.js";
import { PostgresIntegrationRepository } from "./postgres-repository.js";
import {
  IntercomProviderClient,
  NotionProviderClient,
  SentryProviderClient,
} from "./provider-clients.js";
import { createIntegrationReadClients } from "./read-clients.js";
import { IntegrationService } from "./service.js";

type CreateIntegrationModuleOptions = {
  database: pg.Pool;
  config?: IntegrationOAuthConfig;
  fetcher?: typeof fetch;
};

export function createIntegrationModule({
  database,
  config,
  fetcher = fetch,
}: CreateIntegrationModuleOptions) {
  const repository = new PostgresIntegrationRepository(database);
  const cipher = config
    ? new IntegrationSecretCipher(config.encryptionKey)
    : undefined;
  const intercom = config?.intercom
    ? new IntercomProviderClient(config.intercom, fetcher)
    : undefined;
  const sentry = config?.sentry
    ? new SentryProviderClient(config.sentry, fetcher)
    : undefined;
  const notion = config?.notion
    ? new NotionProviderClient(config.notion, fetcher)
    : undefined;
  const service = new IntegrationService({
    repository,
    cipher,
    intercom,
    sentry,
    notion,
  });
  const readClients = createIntegrationReadClients(repository, cipher, fetcher);

  return { service, readClients };
}

export type IntegrationModule = ReturnType<typeof createIntegrationModule>;
