/**
 * Extra options that apply to each controller action.
 */
export interface ApplicationOptions {

  environment?: string;
  port?: number;

  /**
   * Indicates if default routing-controller's error handler is enabled or not.
   * Enabled by default.
   */
  defaultErrorHandler?: boolean;

  /**
   * Global Options for exposed REST endpoints
   * */
  apiOptions?: ApiOptions;
}

export type ApiOptions = {
  /**
   * Global route prefix, for example '/api'.
   */
  routePrefix?: string;

  /**
   * If set, all null responses will return specified status code by default
   */
  nullResultCode?: number;

  /**
   * If set, all undefined responses will return specified status code by default
   */
  undefinedResultCode?: number;

  /**
   * Default param options
   */
  paramOptions?: {
    /**
     * If true, all non-set parameters will be required by default
     */
    required?: boolean;
  };
}
