/**
 * Credentials are not persisted here: the session lives in the account's
 * browser partition cookies and the Rettiwt API key is derived from them
 * on demand.
 */
export type TwitterUnofficialAccountData = {
  userName?: string;
};