/** Server-only backdoor username. Set BACKDOOR_USERNAME in production. */
export function normalizeAuthValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed ? trimmed.toLowerCase() : null;
}

export function getBackdoorUsername(): string | null {
  const configured = normalizeAuthValue(process.env.BACKDOOR_USERNAME);
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return "ron";
  }

  return null;
}

export function getBackdoorUserEmail(username: string) {
  return `${username}@local.dev`;
}
