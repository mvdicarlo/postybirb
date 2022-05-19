// Not technically a Dto, but I don't have a better location for this at the moment.
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
};
