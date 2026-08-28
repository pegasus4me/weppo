"use client";

import { useEffect, useMemo, useState } from "react";

type Playbook = {
  id: string;
  name: string;
  hypothesis: string;
  knowledgeTag: string;
  campaignContext: string;
  weppoHelp: string;
  disarmingLine: string;
  callToAction: string;
  updatedAt: string;
};

type Campaign = {
  id: string;
  name: string;
  playbookId: string;
  playbookName: string;
  createdAt: string;
  playbook: Playbook;
};

const storageKey = "weppo-gtm-playbooks-v1";
const campaignStorageKey = "weppo-gtm-campaigns-v1";

function makeId() {
  return crypto.randomUUID();
}

function timestamp() {
  return new Date().toISOString();
}

function blankPlaybook(name = "Untitled playbook"): Playbook {
  return {
    id: makeId(),
    name,
    hypothesis: "",
    knowledgeTag: "",
    campaignContext: "",
    weppoHelp: "",
    disarmingLine: "",
    callToAction: "",
    updatedAt: timestamp(),
  };
}

const starterPlaybook: Playbook = {
  id: "technical-escalation-discovery",
  name: "Technical escalation discovery",
  hypothesis:
    "Technical support engineers may lose significant time turning incomplete customer tickets into an investigation-ready case when context is spread across the helpdesk, logs, monitoring, internal docs, and product systems. I want to learn how often this happens, where the investigation breaks down, and whether a sourced context pack would improve the engineer’s first step.",
  knowledgeTag: "",
  campaignContext:
    "Founder research for Weppo. This is not a product demo campaign. The goal is to speak with people who handle complex technical support escalations and understand their real investigation workflow.",
  weppoHelp:
    "Weppo gathers the relevant customer, ticket, telemetry, documentation, and previous-case context into a read-only, sourced investigation brief. It separates verified evidence, customer statements, hypotheses, and missing information so the engineer can start in the right place.",
  disarmingLine:
    "We’re still early and trying to understand what is genuinely useful before building further.",
  callToAction:
    "Would you be open to a short 20-minute conversation about how you investigate complex support escalations today?",
  updatedAt: "2026-08-23T00:00:00.000Z",
};

function readStoredItems<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PlaybookWorkspace() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([starterPlaybook]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState(starterPlaybook.id);
  const [campaignName, setCampaignName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const storedPlaybooks = readStoredItems(storageKey, [starterPlaybook]);
    const storedCampaigns = readStoredItems<Campaign>(campaignStorageKey, []);
    setPlaybooks(storedPlaybooks);
    setCampaigns(storedCampaigns);
    setSelectedId(storedPlaybooks[0]?.id ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(playbooks));
  }, [hydrated, playbooks]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(campaignStorageKey, JSON.stringify(campaigns));
    }
  }, [campaigns, hydrated]);

  const selected = useMemo(
    () => playbooks.find((playbook) => playbook.id === selectedId) ?? null,
    [playbooks, selectedId],
  );

  function updateSelected(field: keyof Omit<Playbook, "id" | "updatedAt">, value: string) {
    if (!selected) return;
    setPlaybooks((items) =>
      items.map((item) =>
        item.id === selected.id ? { ...item, [field]: value, updatedAt: timestamp() } : item,
      ),
    );
  }

  function createPlaybook() {
    const next = blankPlaybook();
    setPlaybooks((items) => [next, ...items]);
    setSelectedId(next.id);
    setNotice("New playbook created.");
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = {
      ...selected,
      id: makeId(),
      name: `${selected.name} copy`,
      updatedAt: timestamp(),
    };
    setPlaybooks((items) => [copy, ...items]);
    setSelectedId(copy.id);
    setNotice("Playbook duplicated.");
  }

  function deleteSelected() {
    if (!selected || !window.confirm(`Delete “${selected.name}”?`)) return;
    const next = playbooks.filter((item) => item.id !== selected.id);
    setPlaybooks(next);
    setSelectedId(next[0]?.id ?? "");
    setNotice("Playbook deleted. Existing campaigns keep their copied version.");
  }

  function createCampaign() {
    if (!selected) return;
    const name = campaignName.trim() || `${selected.name} campaign`;
    const campaign: Campaign = {
      id: makeId(),
      name,
      playbookId: selected.id,
      playbookName: selected.name,
      createdAt: timestamp(),
      playbook: { ...selected },
    };
    setCampaigns((items) => [campaign, ...items]);
    setCampaignName("");
    setNotice("Campaign created with a frozen playbook copy.");
  }

  if (!hydrated) {
    return <main className="loading">Loading GTM workspace…</main>;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h1>GTM teammate</h1>
        </div>
        <p className="storage-note">Saved in this browser for now</p>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Campaign playbooks</p>
          <h2>Reuse your campaign thinking.</h2>
          <p>
            A playbook pre-fills a campaign. Each campaign keeps its own copy, so
            future edits never rewrite what you sent before.
          </p>
        </div>
        <button type="button" className="primary" onClick={createPlaybook}>
          New playbook
        </button>
      </section>

      {notice ? <p className="notice" role="status">{notice}</p> : null}

      <section className="workspace" aria-label="Campaign playbooks">
        <aside className="playbook-list">
          <div className="list-heading">
            <span>Saved playbooks</span>
            <span>{playbooks.length}</span>
          </div>
          {playbooks.length ? (
            playbooks.map((playbook) => (
              <button
                key={playbook.id}
                type="button"
                onClick={() => setSelectedId(playbook.id)}
                className={playbook.id === selectedId ? "playbook active" : "playbook"}
              >
                <strong>{playbook.name || "Untitled playbook"}</strong>
                <span>Updated {formatDate(playbook.updatedAt)}</span>
              </button>
            ))
          ) : (
            <p className="empty">Create your first reusable playbook.</p>
          )}
        </aside>

        {selected ? (
          <section className="editor">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">Playbook</p>
                <h2>{selected.name || "Untitled playbook"}</h2>
              </div>
              <div className="actions">
                <button type="button" className="secondary" onClick={duplicateSelected}>
                  Duplicate
                </button>
                <button type="button" className="danger" onClick={deleteSelected}>
                  Delete
                </button>
              </div>
            </div>

            <div className="fields">
              <Field label="Playbook name">
                <input
                  value={selected.name}
                  onChange={(event) => updateSelected("name", event.target.value)}
                  placeholder="e.g. Technical escalation discovery"
                />
              </Field>
              <Field label="Problem hypothesis" hint="What you want to learn — never a proven recipient fact.">
                <textarea
                  value={selected.hypothesis}
                  onChange={(event) => updateSelected("hypothesis", event.target.value)}
                  rows={6}
                />
              </Field>
              <Field label="GTM knowledge base tag" hint="Optional campaign memory.">
                <input
                  value={selected.knowledgeTag}
                  onChange={(event) => updateSelected("knowledgeTag", event.target.value)}
                  placeholder="Leave empty until you have a GTM note to attach"
                />
              </Field>
              <Field label="Campaign context" hint="Why this campaign exists; it guides the ask, not recipient claims.">
                <textarea
                  value={selected.campaignContext}
                  onChange={(event) => updateSelected("campaignContext", event.target.value)}
                  rows={4}
                />
              </Field>
              <Field label="What Weppo helps them do" hint="Describe the workflow, without invented proof.">
                <textarea
                  value={selected.weppoHelp}
                  onChange={(event) => updateSelected("weppoHelp", event.target.value)}
                  rows={5}
                />
              </Field>
              <Field label="Proof or disarming line" hint="Optional.">
                <textarea
                  value={selected.disarmingLine}
                  onChange={(event) => updateSelected("disarmingLine", event.target.value)}
                  rows={3}
                />
              </Field>
              <Field label="Call to action">
                <textarea
                  value={selected.callToAction}
                  onChange={(event) => updateSelected("callToAction", event.target.value)}
                  rows={3}
                />
              </Field>
            </div>

            <div className="campaign-create">
              <div>
                <p className="eyebrow">Start a campaign</p>
                <h3>Copy this playbook into a campaign.</h3>
                <p>The copy is frozen at creation, so campaign history stays trustworthy.</p>
              </div>
              <div className="campaign-action">
                <input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder={`${selected.name} campaign`}
                  aria-label="Campaign name"
                />
                <button type="button" className="primary" onClick={createCampaign}>
                  Create campaign
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="editor empty-editor">
            <h2>No playbook selected</h2>
            <button type="button" className="primary" onClick={createPlaybook}>
              Create a playbook
            </button>
          </section>
        )}
      </section>

      <section className="campaigns" aria-labelledby="campaigns-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Campaigns</p>
            <h2 id="campaigns-heading">Created from playbooks</h2>
          </div>
          <span>{campaigns.length}</span>
        </div>
        {campaigns.length ? (
          <div className="campaign-grid">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="campaign-card">
                <p>{formatDate(campaign.createdAt)}</p>
                <h3>{campaign.name}</h3>
                <span>Copied from {campaign.playbookName}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty campaign-empty">No campaigns yet. Create one when a playbook is ready.</p>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: Readonly<{ label: string; hint?: string; children: React.ReactNode }>) {
  return (
    <label className="field">
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
      {children}
    </label>
  );
}
