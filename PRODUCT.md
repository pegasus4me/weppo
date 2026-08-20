# Weppo — Product Description (MVP)

## One-liner

**Weppo is an AI tech support teammate working 24/7 alongside your engineering team.**

Weppo is not sold as a feature. It is an additional capability inside the team: it plugs into your helpdesk (and Slack or Discord), takes incoming tickets, triages whether a ticket is technical and needs investigation, runs the investigation end-to-end, and notifies engineers and tech support once it has everything needed to resolve the issue quickly.

---

# 1. The Goal

### Make high-quality T2 support accessible to growing SaaS companies.

Today's technical support tooling is largely built and priced for large enterprises.

Weppo takes the same high-value investigation workflow and makes it:

* **Accessible** to Seed → Series B SaaS
* **Self-serve** instead of sales-led
* **Transparent** instead of opaque enterprise pricing
* **Fast to deploy** instead of requiring implementation
* **Affordable enough to adopt early**
* **Powerful enough to grow with the customer**

The goal is not to build a cheaper enterprise product.

**The goal is to bring technical support intelligence to a much larger part of the SaaS market.**

---

# 2. ICP

## Primary ICP

**Seed to Series B technical B2B SaaS companies**

Typical characteristics:

* ~10–250 employees
* Technical product
* Meaningful API / integration / infrastructure complexity
* Growing customer base
* Increasing technical support volume
* Small Support / Customer Success team
* Engineers still pulled into customer issues

### Initial sweet spot

**10–50 employee SaaS companies** where technical support volume is starting to outpace team capacity.

The company does not need a large support organization.

In fact, that is the point.

Weppo should work when:

> "We have enough technical support problems to hurt, but we're nowhere near big enough to buy a giant enterprise support platform."

---

# 3. The Problem

Complex B2B SaaS support issues require investigation.

A customer submits an incomplete ticket:

> "Our webhook stopped working yesterday."

The TSE now has to reconstruct what happened.

Relevant information may be scattered across:

* Helpdesk
* Application logs
* Error traces
* Monitoring
* Customer data
* Product data
* Internal documentation
* Incident history
* Slack
* Jira / Linear
* GitHub

The TSE manually collects and connects this information before Engineering can even start.

### The result

* TSEs spend too much time investigating
* Engineers get pulled into repetitive support work
* Escalations lack context
* Customers wait longer
* Support teams need to hire earlier
* Growing SaaS companies struggle to afford enterprise-grade tooling

---

# 4. The Solution

## Weppo is a teammate, not a tool the team operates.

Weppo connects to a company's existing tools in read-only mode and works alongside the team like a teammate would.

It plugs into the helpdesk (or Slack / Discord), takes the tickets as they come in, and decides what to do with each one.

Given an incoming ticket, Weppo:

1. **Triages** the ticket — is it technical? Does it need investigation?
2. **Understands** the issue
3. Determines what information is missing
4. Chooses relevant systems to investigate
5. Searches those systems
6. Connects the evidence
7. Reconstructs a sourced timeline
8. Separates facts from hypotheses
9. Produces an Engineering-ready technical case
10. **Notifies** engineers and tech support once the investigation is complete, with everything needed to resolve the issue quickly

The result:

> **A TSE can go from incomplete ticket → investigated technical case in minutes instead of manually reconstructing the entire situation.**

Weppo does not replace the ticket.

Weppo does not replace the engineer.

**Weppo removes the investigative work between them.**

---

# 5. Core Workflow

## Own the reconstruction of the case.

### 1. Trigger

A ticket comes in on the helpdesk, Slack, or Discord.

Weppo takes it — no one has to ask it to start.

### 1b. Triage

Weppo decides whether the ticket is technical and needs investigation, or whether it can be answered directly.

Non-technical tickets are handled or routed. Technical tickets move into investigation.

### 2. Understand

Weppo extracts:

* Customer
* Feature
* Expected behavior
* Observed behavior
* Time window
* Impact
* Environment
* Missing information

### 3. Plan

The agent determines where to investigate based on the issue.

Examples:

* Sync
* SSO
* Webhooks
* API
* Permissions
* Data issues
* Integrations

### 4. Investigate

The agent loops:

**Question → Search → Observe → Evaluate → Next question**

### 5. Reconstruct

Weppo builds a sourced timeline:

**Timestamp + Source + Identifier + Evidence**

Not just an AI-generated summary.

### 6. Technical Case

Weppo produces:

* Impact
* Expected behavior
* Observed behavior
* Environment
* Timeline
* Evidence
* Suspected cause
* Missing information
* Workaround
* Engineering request

### 7. Validate

The TSE reviews, corrects, and approves the investigation before sending it to Engineering.

### 8. Notify

Once the investigation is complete, Weppo notifies the engineers (and tech support) with the technical case — everything they need to resolve the issue quickly.

Weppo works 24/7, so tickets keep being triaged and investigated even when the team is not online.

---

# 6. Product Principle

## Weppo works like a teammate, not a tool you operate.

Weppo is not a button the TSE clicks when a ticket is hard. It is an additional capability in the team: it sits where the tickets come in, picks up the work, and hands it over ready for action.

A **case** is the investigation folder attached to the original ticket.

An **agent** investigates the issue, searches connected systems, connects evidence, and drafts the technical escalation.

Weppo should complement:

* Zendesk
* Intercom
* Linear
* Jira
* Slack
* Discord
* Observability tools

—not replace them.

---

# 7. Primary Users

### Technical Support Engineers

Primary user.

They get technical investigations done for them, reviewed, and handed over ready for Engineering — without doing the digging themselves.

### Engineers

Secondary user.

They get notified with a complete technical case instead of an incomplete ticket, and spend less time asking Support for missing information.

---

# 8. Buyers

### Primary

* Head of Support
* Head of Customer Success
* Founder

### Technical stakeholder

* CTO
* VP Engineering
* Engineering Lead

### Early-stage reality

At 10–25 employees, the buyer may simply be:

> **The founder or CTO who is tired of engineers doing support.**

---

# 9. Why Weppo Wins

Weppo is designed around an underserved segment:

**Growing SaaS companies that need serious technical support capabilities but are too small to justify enterprise software.**

### The positioning

**Enterprise-grade technical investigation.
Startup-friendly adoption.**

Weppo should be:

* Easy to start
* Transparent in pricing
* Affordable at the entry level
* Useful with a small team
* Self-serve
* Expandable as support volume grows

### Strategic advantage

We don't need to win by charging the most per customer.

We can win by becoming the **default technical investigation layer for growing SaaS companies.**

---

# 10. Business Model Principle

## Land early. Grow with the customer.

The initial product should be inexpensive enough that a growing SaaS company can adopt Weppo without:

* Procurement
* Enterprise sales
* Long contracts
* Implementation projects
* Large upfront commitments

The customer can start small.

As they grow, Weppo expands through:

* More investigations
* More users
* More connected systems
* More automation
* More advanced workflows
* Larger support volumes

### Pricing philosophy

**Accessible entry point + natural expansion.**

Do not optimize the initial contract value at the expense of adoption.

The objective is to maximize:

**Number of SaaS companies using Weppo × retention × expansion.**

---

# 11. Integrations

### Helpdesk

* Zendesk
* Intercom

### Observability

* Datadog
* Sentry
* Grafana
* CloudWatch

### Product data

* PostgreSQL
* Internal APIs

### Internal knowledge

* Notion
* Slack
* Documentation

### Engineering

* Linear
* Jira
* GitHub

All MVP integrations are **read-only**.

---

# 12. Interface

Three panes:

### Ticket

Original customer conversation.

### Investigation

Agent actions, questions, searches, evidence, and sources.

### Escalation

Editable technical case ready for Engineering.

The agent stays visible throughout the investigation.

Examples:

> "Found 17 failed sync jobs."

> "Webhook failures started 14 minutes after deployment."

> "Missing: expected OAuth scopes."

> "3 customers show the same error pattern."

The user should be able to understand **what Weppo knows, where it found it, and what it still doesn't know.**

---

# 13. MVP Scope

## Included

* Manual case creation
* Pasted ticket
* One helpdesk connector
* One logs / observability connector
* Investigation loop
* Sourced evidence
* Missing information detection
* Timeline reconstruction
* Technical case generation
* TSE validation
* Manual copy to Engineering

## Excluded

* Automatic issue resolution
* Modifying customer data
* Automatic Engineering escalation
* Ten+ connectors
* Global automatic learning
* Replacing the helpdesk
* Fully autonomous support

---

# 14. Primary Metric

## Investigation → accepted escalation

**Time between opening an investigation and an escalation being accepted by Engineering without requesting additional context.**

The product succeeds when:

> **Engineering can act on the first escalation.**

Secondary metrics:

* Investigation completion rate
* Time saved per investigation
* % of escalations requiring follow-up
* Engineering escalations avoided
* Investigations per customer
* Weekly active TSEs
* Customer retention
* Expansion from usage

---

# 15. Expansion Path

The initial wedge is **T2 investigation**.

The long-term platform can expand from there:

### Phase 1 — Investigate

**Ticket → Evidence → Technical Case**

### Phase 2 — Escalate

**Technical Case → Engineering Workflow**

### Phase 3 — Resolve

**Investigation → Suggested Fix / Resolution**

### Phase 4 — Detect

**Individual Tickets → Recurring Issues / Proactive Detection**

### Phase 5 — Understand

**Support Data → Product & Customer Intelligence**

The long-term vision:

> **Weppo becomes the intelligence layer connecting customers, Support, Product, and Engineering.**

But the initial product remains deliberately narrow:

**Make T2 investigation dramatically faster for growing SaaS teams.**
