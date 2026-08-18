"use client";

import { useState } from "react";

import { mockScenarios, type MockScenarioSlug } from "@/lib/mock-cases";

import { IntercomWidget, type IntercomWidgetRegion } from "./intercom-widget";

type IntercomWidgetConfig = {
  appId: string;
  region: IntercomWidgetRegion;
  user: { id: string; name: string; email: string };
  userJwt?: string | null;
};

type FailedAction = {
  scenario: MockScenarioSlug;
  message: string;
};

export function MockCaseLab({
  enabled,
  intercomWidget,
}: {
  enabled: boolean;
  intercomWidget: IntercomWidgetConfig | null;
}) {
  const [running, setRunning] = useState<MockScenarioSlug | null>(null);
  const [failedAction, setFailedAction] = useState<FailedAction | null>(null);

  async function performAction(scenario: MockScenarioSlug) {
    setRunning(scenario);
    setFailedAction(null);

    try {
      const response = await fetch(`/api/mock-errors/${scenario}`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || payload.ok !== true) {
        setFailedAction({
          scenario,
          message:
            payload.message ??
            "Something went wrong. Please wait a moment and try again.",
        });
        return;
      }
    } catch {
      setFailedAction({
        scenario,
        message: "Something went wrong. Please wait a moment and try again.",
      });
    } finally {
      setRunning(null);
    }
  }

  async function contactSupport() {
    if (!intercomWidget) return;
    const { show } = await import("@intercom/messenger-js-sdk");
    show();
  }

  return (
    <div className="app-shell">
      {intercomWidget ? (
        <IntercomWidget
          appId={intercomWidget.appId}
          region={intercomWidget.region}
          user={intercomWidget.user}
          userJwt={intercomWidget.userJwt}
        />
      ) : null}

      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Northstar Cloud home">
          <span className="brand-mark">N</span>
          <span>Northstar</span>
        </a>

        <nav aria-label="Primary navigation">
          <a href="#overview">Overview</a>
          <a href="#billing" aria-current="page">
            Billing
          </a>
          <a href="#integrations">Integrations</a>
          <a href="#team">Team</a>
        </nav>

        <div className="account-card">
          <span className="avatar">MC</span>
          <div>
            <strong>Maya Chen</strong>
            <span>Northstar Labs</span>
          </div>
        </div>
      </aside>

      <main id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">Northstar Labs</p>
            <h1>Billing &amp; operations</h1>
          </div>
          <button className="notification-button" type="button">
            <span aria-hidden="true">●</span>
            <span className="sr-only">Notifications</span>
          </button>
        </header>

        <section className="metrics" id="overview" aria-label="Account summary">
          <article>
            <span>Monthly spend</span>
            <strong>$12,480</strong>
            <small>Next invoice Aug 31</small>
          </article>
          <article>
            <span>Processed events</span>
            <strong>8.42M</strong>
            <small>72% of plan allowance</small>
          </article>
          <article>
            <span>Team seats</span>
            <strong>24 / 24</strong>
            <small>All seats currently assigned</small>
          </article>
        </section>

        <section
          className="workspace-section"
          aria-labelledby="workspace-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Workspace settings</p>
              <h2 id="workspace-title">Manage your account</h2>
            </div>
            <p>Changes apply immediately to Northstar Labs.</p>
          </div>

          <div className="action-grid">
            {mockScenarios.map((scenario) => {
              const hasFailed = failedAction?.scenario === scenario.slug;
              const isRunning = running === scenario.slug;

              return (
                <article
                  className="action-card"
                  id={scenario.sectionId}
                  key={scenario.slug}
                >
                  <p className="eyebrow">{scenario.eyebrow}</p>
                  <h3>{scenario.productTitle}</h3>
                  <p className="action-summary">{scenario.productSummary}</p>

                  <div className="product-detail">
                    <span>{scenario.detailLabel}</span>
                    <strong>{scenario.detailValue}</strong>
                  </div>

                  {hasFailed ? (
                    <div className="inline-error" role="alert">
                      <strong>We couldn’t complete that request</strong>
                      <p>{failedAction.message}</p>
                      {intercomWidget ? (
                        <button
                          type="button"
                          onClick={() => void contactSupport()}
                        >
                          Contact support
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    className="primary-action"
                    type="button"
                    disabled={!enabled || running !== null}
                    onClick={() => void performAction(scenario.slug)}
                  >
                    {isRunning ? scenario.loadingLabel : scenario.actionLabel}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <footer>
          <span>© 2026 Northstar Cloud</span>
          <a href="#top">Status</a>
          <a href="#top">Privacy</a>
        </footer>
      </main>
    </div>
  );
}
