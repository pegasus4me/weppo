import type {
  InvestigationSnapshot,
  InvestigationStatus,
  InvestigationSummary,
} from "../model/investigation.types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiError = {
  error?: { message?: string };
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  const body = (await response.json().catch(() => ({}))) as ApiError;
  throw new Error(body.error?.message ?? "Weppo could not complete the request.");
}

export async function loadInvestigation(caseId: string) {
  const response = await fetch(
    `${apiUrl}/api/v1/investigations/${encodeURIComponent(caseId)}`,
    { credentials: "include" },
  );
  return parseResponse<InvestigationSnapshot>(response);
}

export async function loadInvestigations(status?: InvestigationStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${apiUrl}/api/v1/investigations${query}`, {
    credentials: "include",
  });
  return parseResponse<{ investigations: InvestigationSummary[] }>(response);
}

export async function createInvestigation(input: {
  customer: string;
  report: string;
  ticketUrl?: string;
}) {
  const response = await fetch(`${apiUrl}/api/v1/investigations`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      customer: input.customer,
      report: input.report,
      ticket: input.ticketUrl
        ? { provider: "manual", url: input.ticketUrl }
        : { provider: "manual" },
    }),
  });
  return parseResponse<{ case: { id: string }; run: { id: string } }>(response);
}

export async function deleteInvestigation(caseId: string) {
  const response = await fetch(
    `${apiUrl}/api/v1/investigations/${encodeURIComponent(caseId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (response.status === 204) return;
  await parseResponse(response);
}

export async function submitInvestigationFollowUp(
  caseId: string,
  prompt: string,
) {
  const response = await fetch(
    `${apiUrl}/api/v1/investigations/${encodeURIComponent(caseId)}/follow-ups`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    },
  );
  return parseResponse<{ event: { id: string; sequence: number } }>(response);
}
