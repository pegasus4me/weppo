export const mockScenarios = [
  {
    slug: "invoice-export",
    sectionId: "billing",
    eyebrow: "Billing",
    productTitle: "Invoice exports",
    productSummary:
      "Download a CSV archive of the invoices issued by your workspace.",
    detailLabel: "July 2026",
    detailValue: "48,219 invoices",
    actionLabel: "Export CSV",
    loadingLabel: "Preparing export…",
    customerError:
      "Your export couldn’t be prepared. No data was changed. Please try again.",
    errorName: "InvoiceExportTimeoutError",
    errorMessage: "Invoice export query exceeded the 30 second timeout",
    impact: "Finance cannot export the July invoice reconciliation file.",
    endpoint: "POST /api/billing/invoices/export",
  },
  {
    slug: "webhook-delivery",
    sectionId: "integrations",
    eyebrow: "Developer tools",
    productTitle: "Webhook delivery",
    productSummary:
      "Retry order events that haven’t reached your configured endpoint.",
    detailLabel: "order.created",
    detailValue: "8 failed deliveries",
    actionLabel: "Retry deliveries",
    loadingLabel: "Retrying…",
    customerError:
      "The deliveries couldn’t be retried. They’ll remain in your activity log.",
    errorName: "WebhookDeliveryExhaustedError",
    errorMessage: "Webhook delivery failed after 8 attempts with HTTP 401",
    impact: "Order-created events are not reaching the customer warehouse.",
    endpoint: "POST /api/webhooks/order-created/deliver",
  },
  {
    slug: "seat-upgrade",
    sectionId: "team",
    eyebrow: "Plan & billing",
    productTitle: "Team seats",
    productSummary:
      "Add capacity for new teammates while keeping your current annual plan.",
    detailLabel: "Current usage",
    detailValue: "24 of 24 seats",
    actionLabel: "Add 6 seats",
    loadingLabel: "Updating plan…",
    customerError:
      "Your subscription couldn’t be updated. You haven’t been charged.",
    errorName: "SubscriptionVersionConflictError",
    errorMessage: "Expected account version 184 but received version 181",
    impact: "Admins cannot add seats for new teammates.",
    endpoint: "PATCH /api/subscriptions/seat-count",
  },
  {
    slug: "usage-reconciliation",
    sectionId: "reporting",
    eyebrow: "Usage reporting",
    productTitle: "Monthly usage reconciliation",
    productSummary:
      "Refresh the reconciled usage report before closing the monthly billing period.",
    detailLabel: "August reconciliation",
    detailValue: "2,814,904 events pending",
    actionLabel: "Refresh reconciliation",
    loadingLabel: "Reconciling usage…",
    customerError:
      "Your usage report couldn’t be refreshed. Your last completed report is still available.",
    errorName: "UsageRollupCursorConflictError",
    errorMessage:
      "Usage rollup checkpoint rejected: a late duplicate event advanced the cursor after the reconciliation lease expired",
    impact:
      "Finance sees a stale usage report while the billing close is in progress.",
    endpoint: "POST /api/usage/reconciliation/refresh",
  },
] as const;

export type MockScenario = (typeof mockScenarios)[number];
export type MockScenarioSlug = MockScenario["slug"];

export function findMockScenario(value: string) {
  return mockScenarios.find((scenario) => scenario.slug === value);
}
