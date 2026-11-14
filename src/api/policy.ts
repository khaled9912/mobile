import { apiFetch } from "./client";
import type { PolicyAcceptance, PolicyDocument, PolicyState } from "./types";

export const getPolicyDocument = (key: string) =>
  apiFetch<PolicyDocument>(`/api/policy/${encodeURIComponent(key)}`);

export const getPolicyState = () => apiFetch<PolicyState>("/api/policy/state");

export const acceptPolicy = (
  policyKey: string,
  version: number,
  clauseIds: string[]
) =>
  apiFetch<PolicyAcceptance>("/api/policy/accept", {
    method: "POST",
    json: { policyKey, version, clauseIds },
  });
