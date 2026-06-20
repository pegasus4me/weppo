import { ApplyPilotDialog } from "@/app/components/apply-pilot-dialog";
import { Header } from "@/app/components/header";

const growthPressures = [
  {
    title: "More clients",
    body: "creates more repeated questions and more context switching.",
  },
  {
    title: "More students",
    body: "adds more support overhead between sessions and launches.",
  },
  {
    title: "More subscribers",
    body: "creates more pressure to stay available all the time.",
  },
];

const outcomePoints = [
  {
    title: "Ask questions in context",
    body: "Your audience can get support between touchpoints instead of waiting on you manually.",
  },
  {
    title: "Get clear next steps",
    body: "They move from consuming your ideas to actually applying your method.",
  },
  {
    title: "Know when to escalate",
    body: "The copilot helps with implementation and surfaces when deeper coaching is needed.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen bg-background">
      <Header />

      <section className="container relative mx-auto mb-4 mt-4 flex max-w-6xl justify-center overflow-hidden rounded-[2rem] bg-secondary px-4 pb-24 pt-20 text-center md:px-6 md:pt-28">
        <div className="relative z-10 flex max-w-4xl flex-col items-center">
          <h1 className="max-w-4xl font-crimson-text text-5xl font-semibold leading-[0.95] text-text md:text-7xl">
            Your expertise, available to{" "}
            <span className="">every client at once</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-text md:text-xl">
            Weppo turns your scattered content, frameworks, and resources into a
            unified AI copilot that helps your clients, students, or paid
            subscribers apply your ideas while you focus on what matters.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <ApplyPilotDialog />
          </div>
        </div>
      </section>

      <section
        id="problem"
        className="container mx-auto max-w-6xl px-4 pb-6 md:px-6"
      >
        <div className="rounded-[2rem] px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <h2 className="mt-4 max-w-3xl font-crimson-text text-4xl font-semibold leading-[0.98] text-foreground md:text-6xl">
              Your audience does not just need more content.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
              They need help applying your ideas to their situation. Today, that
              support happens manually through DMs, email, office hours,
              comments, or 1:1 coaching.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {growthPressures.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] bg-background px-6 py-7 text-left"
              >
                <p className="text-sm font-light text-center text-muted-foreground">
                  {item.title}
                </p>
                <p className="mt-4 font-crimson-text text-center text-2xl leading-tight text-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-4xl text-center">
            <p className="font-crimson-text text-3xl leading-tight text-foreground md:text-4xl">
              More demand should create leverage,{" "}
              <span className="bg-red-100">not more manual support.</span>
            </p>
          </div>
        </div>
      </section>

      <section
        id="outcome"
        className="container mx-auto max-w-6xl px-4 pb-28 md:px-6"
      >
        <div className="rounded-[2rem]  px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <h2 className="mt-4 max-w-3xl font-crimson-text text-4xl font-semibold leading-[0.98] text-foreground md:text-6xl">
              A guided implementation layer{" "}
              <span className="">between touchpoints</span>
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
              Weppo gives your audience a branded AI copilot coach so they can
              move forward between touchpoints instead of waiting for your next
              reply.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
            {outcomePoints.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] bg-background px-6 py-7 text-left"
              >
                <p className="text-sm font-light text-center text-muted-foreground">
                  {item.title}
                </p>
                <p className="mt-4 font-crimson-text text-center text-2xl leading-tight text-foreground ">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div
            id="apply"
            className="mx-auto mt-12 flex max-w-4xl flex-col items-center rounded-[1.75rem] bg-background px-6 py-12 text-center md:px-12"
          >
            <p className="mt-4 max-w-2xl font-crimson-text text-3xl leading-tight text-foreground md:text-4xl">
              Give every client answers, next steps, and implementation support
              with an AI copilot trained on your method.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              We are opening a small early pilot for experts who want their
              audience to get answers, next steps, and implementation help
              without waiting for another DM, email, or office hour.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-col sm:items-center">
              <ApplyPilotDialog />
              <small className="text-sm text-muted-foreground">
                Limited early spots for independent experts with proven
                material.
              </small>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
