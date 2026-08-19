# Weppo — Product description (MVP)

Weppo is a **technical investigation workspace** between the helpdesk and
Engineering. It replaces neither the ticket nor the engineer: it automates the
repetitive investigative work.

## ICP

Weppo is built first for **Seed to Series A technical B2B SaaS companies**
with roughly **10–100 employees** and high technical ticket velocity. The sweet spot
is a fast-growing team where technical support volume outpaces the team's capacity—
forcing either dedicated support agents or core software engineers to drown in repetitive investigations.

These companies usually sell products with APIs, integrations, data sync,
permissions, SSO, workflow configuration, PLG self-serve workflows, or other technically observable
behaviors. A customer issue is rarely solved from the ticket alone: the support
team (or on-call engineers) have to reconstruct the context before resolving or escalating.

## Problem

Technical Support Engineers spend significant time turning incomplete customer
tickets into technical cases that Engineering teams can investigate.

For complex issues, the required diagnosis context is scattered across
ticketing systems, logs, monitoring tools, customer and product data, internal
documentation, incident history, and engineering-management tools. Support
engineers manually collect, verify, and organize this context before they can
escalate.

## Solution

Weppo connects to your tools in read-only mode to pull logs, error traces, and user context into a complete bug report in under 2 minutes. Support escalates instantly with technical proof, and engineers fix bugs without back-and-forth questions.
### Primary users

- Technical Support Engineers (TSEs)
- Engineers 


### Buyers and stakeholders

- Head of Support / Head of Customer Success
- CTO / Engineering leader as the technical stakeholder
- COO or Founder (in 10–25 person teams where engineers handle support)

### Strong buying signals

- Core software engineers spend >15–20% of their sprint diagnosing customer tickets.
- High technical ticket volume relative to a tiny (or non-existent) dedicated support team.
- The company is about to hire more support or technical support capacity.
- Complex tickets stay open for days because context is scattered.
- Support often interrupts Engineering to ask for logs, product context, or
  suspected root causes.
- Senior agents or founding engineers are the only people who know where to look.
- The team uses a helpdesk plus observability, documentation, product data, and
  engineering tools, but no single place reconstructs the case.
- Escalations are rejected or delayed because Engineering asks for more context.

### Bad fit

- Simple B2C or non-technical products.
- Mostly password, billing, refund, or account-access support.
- Very early teams with too little support volume to feel the pain.
- Teams that cannot grant read-only access to the systems needed for
  investigation.
- Large enterprises with heavy procurement as the first wedge.

### Search language

When researching the market, use terms like **technical support engineering**,
**Tier 2 support**, **product support engineer**, **developer support**, and
**customer engineering**. The generic phrase “technical support” often returns
consumer Windows, Mac, or device-support content and is too broad for Weppo.



As a result, preparing a single complex escalation can take multiple minutes to
hours, slowing resolution time and consuming engineering-support capacity on
repetitive coordination work.

## The principle

A **case** is the investigation folder attached to the original ticket, which
stays in Zendesk or Intercom. An **agent** understands the problem, searches
the tools, connects the evidence, and drafts an escalation ready for
Engineering.

## Workflow to own

Weppo owns the workflow of **reconstructing the case**:

1. Understand the incomplete customer ticket.
2. Decide which read-only systems are relevant.
3. Search the helpdesk, observability, product context, internal knowledge, and
   engineering history.
4. Connect the signals into a sourced timeline.
5. Identify what is verified, what is missing, and what remains a hypothesis.
6. Produce an engineering-ready escalation that a TSE can validate.

## The journey

1. **Trigger** — the TSE pastes a ticket or clicks “Investigate with Weppo”.
2. **Understand** — the agent extracts: customer, feature, expected vs observed
   behavior, time window, impact, environment, missing information.
3. **Plan** — the agent chooses where to look based on the problem type (sync,
   SSO, webhook, permissions…).
4. **Investigate** — loop: question → search a tool → observe → evaluate → next
   question.
5. **Reconstruct** — a sourced timeline (timestamp + source + identifier), not
   just a summary.
6. **Technical case** — a structured report: impact, expected/observed,
   environment, timeline, evidence, suspected cause, missing information,
   workaround, Engineering request.
7. **Validate** — the TSE corrects, completes, and approves before sending to
   Linear or Jira.

## Integrations (read-only)

- **Helpdesk**: Zendesk, Intercom
- **Observability**: Datadog, Sentry, Grafana, CloudWatch
- **Product data**: read-only PostgreSQL, internal API
- **Internal knowledge**: Notion, Slack, documentation
- **Engineering**: Linear, Jira, GitHub

## Trust model

Every piece of information is classified: **verified fact**, **customer
statement**, **hypothesis**, **eliminated cause**, **missing information**.
Engineering immediately sees what is certain and what still needs checking.

## Interface

Three panes: **Ticket** (conversation), **Investigation** (agent actions +
sources), **Escalation** (editable report). The agent stays visible:
“Found 17 failed sync jobs”, “Missing: expected scopes”.

## MVP scope

**Included**: manual case creation, pasted ticket, one helpdesk connector + one
logs connector, investigation loop, sourced evidence, missing information,
technical case generation, validation and manual copy.

**Excluded**: automatic resolution, modifying customer data, automatic
escalation to Engineering, ten connectors, global automatic learning, replacing
the helpdesk.

## Primary metric

Time between opening an investigation and an escalation **accepted by
Engineering with no request for additional context**.
