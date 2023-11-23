/**
 * Used to create unique typed component identifier.
 * Useful when component has only interface, but don't have a class.
 */
export declare class Token<T> {
  name?: string;

  /**
   * @param name Token name, optional and only used for debugging purposes.
   */
  constructor(name?: string);
}
