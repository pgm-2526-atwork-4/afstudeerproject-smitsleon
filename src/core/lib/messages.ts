export const MSG = {
  NOT_LOGGED_IN: 'Niet ingelogd',
  NOT_LOGGED_IN_JOIN: 'Log in om deel te nemen aan een groep.',
  NOT_LOGGED_IN_CREATE: 'Log in om een groep aan te maken.',

  GROUP_FULL: 'Groep vol',
  GROUP_FULL_BODY: 'Deze groep heeft het maximale aantal leden bereikt.',

  ERROR: 'Fout',

  REQUIRED_FIELD: 'Verplicht veld',
  GROUP_NAME_REQUIRED: 'Geef je groep een naam.',
} as const;

export function errorRetry(action: string): string {
  return `${action} mislukt. Probeer opnieuw.`;
}
