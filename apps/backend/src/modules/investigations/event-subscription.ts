import type {
  AgentEventListener,
  AgentEventSubscription,
} from "./ports.js";

function subscriptionKey(workspaceId: string, caseId: string) {
  return `${workspaceId}:${caseId}`;
}

export class InMemoryAgentEventSubscription
  implements AgentEventSubscription
{
  private readonly listeners = new Map<string, Set<AgentEventListener>>();

  publish(workspaceId: string, event: Parameters<AgentEventListener>[0]) {
    const listeners = this.listeners.get(subscriptionKey(workspaceId, event.caseId));
    listeners?.forEach((listener) => listener(event));
  }

  subscribe(
    workspaceId: string,
    caseId: string,
    listener: AgentEventListener,
  ) {
    const key = subscriptionKey(workspaceId, caseId);
    const listeners = this.listeners.get(key) ?? new Set<AgentEventListener>();
    listeners.add(listener);
    this.listeners.set(key, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }
}
