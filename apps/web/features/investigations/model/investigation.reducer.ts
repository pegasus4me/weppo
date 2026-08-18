import type {
  AgentEvent,
  ConnectionState,
  InvestigationSnapshot,
} from "./investigation.types";

export type LiveInvestigationState = {
  snapshot: InvestigationSnapshot;
  connection: ConnectionState;
  latestAnnouncement: string;
};

export type InvestigationAction =
  | { type: "connection.changed"; connection: ConnectionState }
  | { type: "event.received"; event: AgentEvent }
  | { type: "snapshot.received"; snapshot: InvestigationSnapshot };

export function createLiveInvestigationState(
  snapshot: InvestigationSnapshot,
): LiveInvestigationState {
  return {
    snapshot,
    connection: "connecting",
    latestAnnouncement: "Connecting to the investigation stream.",
  };
}

export function investigationReducer(
  state: LiveInvestigationState,
  action: InvestigationAction,
): LiveInvestigationState {
  if (action.type === "connection.changed") {
    return {
      ...state,
      connection: action.connection,
      latestAnnouncement:
        action.connection === "live"
          ? "Agent activity is live."
          : action.connection === "reconnecting"
            ? "Reconnecting to agent activity."
            : state.latestAnnouncement,
    };
  }

  if (action.type === "snapshot.received") {
    const current = state.snapshot;
    const incoming = action.snapshot;
    const activity = [
      ...current.activity,
      ...incoming.activity.filter(
        (event) => event.sequence > current.lastSequence,
      ),
    ];
    return {
      ...state,
      snapshot: {
        case: incoming.case,
        activity,
        lastSequence: Math.max(current.lastSequence, incoming.lastSequence),
      },
    };
  }

  if (action.event.sequence <= state.snapshot.lastSequence) return state;

  const evidence = action.event.evidence ?? action.event.casePatch?.evidence;
  const patch = action.event.casePatch;
  const completed = action.event.type === "run.completed";
  const failed = action.event.type === "run.failed";
  const needsInput = action.event.type === "input.requested";
  const currentCase = state.snapshot.case;

  return {
    ...state,
    latestAnnouncement: action.event.title,
    snapshot: {
      ...state.snapshot,
      lastSequence: action.event.sequence,
      activity: [...state.snapshot.activity, action.event],
      case: {
        ...currentCase,
        status: patch?.status ?? (completed
          ? "ready-for-review"
          : failed
            ? "failed"
            : needsInput
              ? "needs-input"
              : currentCase.status),
        reconstructed: {
          ...currentCase.reconstructed,
          summary: patch?.summary ?? currentCase.reconstructed.summary,
          environment:
            patch?.environment === undefined
              ? currentCase.reconstructed.environment
              : patch.environment,
          impact:
            patch?.impact === undefined
              ? currentCase.reconstructed.impact
              : patch.impact,
          ticketScope:
            patch?.ticketScope === undefined
              ? currentCase.reconstructed.ticketScope
              : patch.ticketScope,
          missingInformation:
            patch?.missingInformation ?? currentCase.reconstructed.missingInformation,
          evidence:
            evidence &&
            !currentCase.reconstructed.evidence.some(
              (item) => item.id === evidence.id,
            )
              ? [...currentCase.reconstructed.evidence, evidence]
              : currentCase.reconstructed.evidence,
          hypotheses:
            patch?.hypotheses ?? currentCase.reconstructed.hypotheses,
          branches: patch?.branches ?? currentCase.reconstructed.branches,
          knowledgeRetrieval:
            patch?.knowledgeRetrieval ?? currentCase.reconstructed.knowledgeRetrieval,
          engineeringDraft:
            patch?.engineeringDraft ?? currentCase.reconstructed.engineeringDraft,
        },
      },
    },
  };
}
