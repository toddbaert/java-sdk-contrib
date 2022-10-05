export interface Config {
  /**
   * The domain name or IP address of flagd.
   *
   * @default localhost
   */
  host: string;

  /**
   * The port flagd is listen on.
   *
   * @default 8013
   */
  port: number;

  /**
   * Determines if TLS should be used.
   *
   * @default false
   */
  tls: boolean;

  /**
   * Sets the maximum number of retries for a connection to be made to the flagd instance
   *
   * @default 0
   */
  maxRetries: number;

  /**
   * When set to true the provider will use client side caching
   *
   * @default false
   */
  cache: boolean;

  /**
   * Sets the timeout for items in the cache in seconds, a value of 0 disables the timeout
   *
   * @default 0
   */
  cacheTTL: number;

  /**
   * Sets maximum size for the cache in bytes, once the threshold is reached the cache is emptied
   * A value of 0 disables this functionality
   *
   * @default 0
   */
  cacheMaxBytes: number;
}

export type FlagdProviderOptions = Partial<Config>;

const DEFAULT_CONFIG: Config = {
  host: "localhost",
  port: 8013,
  tls: false,
  cache: false,
  cacheTTL: 0,
  cacheMaxBytes: 0,
  maxRetries: 5,
};

export function getConfig(options: FlagdProviderOptions = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...options,
  };
}
