export type UsernameShortcut = {
  /**
   * Id used by users when referencing a username shortcut.
   * @type {string}
   */
  id: string;

  /**
   * Url that is used for inserting the username.
   * Need to add a '$1' where the username should be inserted.
   * @example https://twitter.com/$1
   * @type {string}
   */
  url: string;

  /**
   * Optional function that can be used to modify the username string before insertion.
   * @param {string} websiteName
   * @param {string} shortcut
   * @returns {string | undefined}
   */
  convert?: (websiteName: string, shortcut: string) => string | undefined;
};
