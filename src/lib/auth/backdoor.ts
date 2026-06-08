/** Server-only backdoor username. Set BACKDOOR_USERNAME in production. */
export function getBackdoorUsername(): string | null {
  const configured = process.env.BACKDOOR_USERNAME?.trim().toLowerCase();
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return "ron";
  }

  return null;
}

export function getBackdoorUserEmail(username: string) {
  return `${username}@local.dev`;
}
