import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Code } from "@repo/ui/code";
import styles from "./page.module.css";

const commandGroups = [
  {
    title: "Run the web app",
    command: "pnpm --filter web dev",
    description: "Starts the polished landing page locally on port 3000.",
  },
  {
    title: "Run the docs app",
    command: "pnpm --filter docs dev",
    description: "Opens this reference surface on port 3001.",
  },
  {
    title: "Validate the workspace",
    command: "pnpm build && pnpm lint",
    description: "Checks the monorepo before you branch into feature work.",
  },
];

const references = [
  {
    eyebrow: "Workspace",
    title: "apps/web",
    body: "Product-facing pages, marketing polish, and the primary visual direction.",
  },
  {
    eyebrow: "Reference",
    title: "apps/docs",
    body: "Quickstart guidance, commands, and implementation notes for teammates.",
  },
  {
    eyebrow: "Shared package",
    title: "packages/ui",
    body: "Reusable buttons, cards, and future primitives that keep both apps consistent.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Docs app</span>
          <h1>Keep the workspace easy to understand while the product grows.</h1>
          <p className={styles.lead}>
            This page now acts as a compact operating manual for the monorepo:
            where things live, what to run, and how the apps relate to each
            other.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroPanelHeader}>
            <span>Quick links</span>
            <strong>Start here</strong>
          </div>
          <div className={styles.heroActions}>
            <Button
              className={styles.primaryButton}
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
            >
              Open web app
            </Button>
            <Button
              className={styles.secondaryButton}
              href="https://nextjs.org/docs"
              variant="ghost"
              target="_blank"
              rel="noreferrer"
            >
              Next.js docs
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.referenceGrid}>
        {references.map((reference) => (
          <Card
            key={reference.title}
            className={styles.referenceCard}
            eyebrow={reference.eyebrow}
            title={reference.title}
          >
            <p>{reference.body}</p>
          </Card>
        ))}
      </section>

      <section className={styles.commandSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionLabel}>Quickstart</span>
          <h2>Three commands you’ll actually use.</h2>
        </div>
        <div className={styles.commandList}>
          {commandGroups.map((item) => (
            <Card
              key={item.command}
              className={styles.commandCard}
              eyebrow={item.title}
              title={item.command}
            >
              <p>{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.noteSection}>
        <div className={styles.noteCard}>
          <span className={styles.sectionLabel}>Workspace note</span>
          <p>
            Shared UI lives in <Code className={styles.inlineCode}>packages/ui</Code>,
            so visual cleanup in one place can improve both apps without
            duplicated edits.
          </p>
        </div>
      </section>
    </main>
  );
}
