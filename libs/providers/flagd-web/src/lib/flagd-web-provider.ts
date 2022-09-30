import {
  EvaluationContext,
  ResolutionDetails,
  ErrorCode,
  StandardResolutionReasons,
  JsonValue
} from '@openfeature/js-sdk';
import {
  createConnectTransport,
  createPromiseClient,
  createCallbackClient,
  PromiseClient,
  CallbackClient,
  ConnectError,
  Code
} from "@bufbuild/connect-web";
import { Struct } from "@bufbuild/protobuf";
import { Service } from '@buf/bufbuild_connect-web_open-feature_flagd-dev/schema/v1/schema_connectweb.js'
import { sha1 } from 'object-hash';
import NodeCache from 'node-cache'
import { time } from 'console';
import { ServerDuplexStreamImpl } from '@grpc/grpc-js/build/src/server-call';

export const ERROR_PARSE_ERROR = "PARSE_ERROR"
export const ERROR_DISABLED = "DISABLED"
export const ERROR_UNKNOWN = "UNKNOWN"

export interface FlagdWebProviderOptions {
  host?: string;
  port?: number;
  tls?: boolean;
  cache?: boolean;
  cacheTTL?: number;
  cacheMaxBytes?: number;
  maxRetries?: number;
}

const EVENT_CONFIGURATION_CHANGE = "configuration_change";
const EVENT_PROVIDER_READY = "provider_ready";
const ERROR_CONNECTION_ERROR = "CONNECTION_ERROR"

export class FlagdWebProvider {
  metadata = {
    name: 'flagD Provider',
  };

  promiseClient: PromiseClient<typeof Service>
  callbackClient: CallbackClient<typeof Service>

  cache: NodeCache;
  cacheActive: boolean;
  providerReady: boolean;
  connectionError = false;

  constructor(options?: FlagdWebProviderOptions) {
    const {host, port, tls, cache, cacheTTL, cacheMaxBytes, maxRetries}: FlagdWebProviderOptions = {
      host: "localhost",
      port: 8013,
      tls: false,
      cache: false,
      cacheTTL: 0,
      cacheMaxBytes: 0,
      maxRetries: 5,
      ...options
    };
    this.providerReady = false;
    const transport = createConnectTransport({
      baseUrl: `${tls ? "https" : "http"}://${host}:${port}`
    });
    this.promiseClient = createPromiseClient(Service, transport);
    this.callbackClient = createCallbackClient(Service, transport);
    this.cache = new NodeCache({
      stdTTL: cacheTTL
    })
    if (cacheMaxBytes != 0) {
      this.cache.addListener("set", () => {
        const s = this.cache.getStats()
        if (s.ksize + s.vsize > cacheMaxBytes) {
          console.log(`maximum cache size of ${cacheMaxBytes} reached: busting cache`)
          this.cache.flushAll();
        }
      })
    }
    this.cacheActive = cache
    this.initConnection(maxRetries)
  }

  async initConnection(maxRetries: number) {
    for (let i=0;i<=maxRetries;i++) {
      this.callbackClient.eventStream(
        {},
        (message) => {
          console.log(`event received: ${message.type}`);
          switch (message.type) {
            case EVENT_PROVIDER_READY:
              this.providerReady = true;
              return
            case EVENT_CONFIGURATION_CHANGE:
              console.log("configuration change: busting cache");
              this.cache.flushAll();
              return
          }
        },
        async () => {
          if (i != maxRetries) {
            const delay = (i+1) * Math.random() * 300
            console.log(`connection failed on attempt ${i+1}, retrying in ${delay}ms`)
            await new Promise(f => setTimeout(f, delay));
          } else {
            console.log("could not establish connection to flagd")
            this.connectionError = true
          }
        },
      )
    }
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    transformedContext: EvaluationContext
  ): Promise<ResolutionDetails<boolean>> {
    if (!this.providerReady) {
      return Promise.resolve({
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: this.connectionError ? ERROR_CONNECTION_ERROR : ErrorCode.PROVIDER_NOT_READY
      })
    }
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache.get(reqHash) != undefined) {
      return Promise.resolve(this.cache.get(reqHash) as ResolutionDetails<boolean>)
    } else {
      console.log(this.cache.get(reqHash))
    }
    return this.promiseClient.resolveBoolean(req).then((res) => {
      const resDetails = {
        value: res.value,
        reason: res.reason,
        variant: res.variant,
      }
      if (this.cacheActive) {
        this.cache.set(reqHash, resDetails)
      }
      return resDetails
    }).catch((err: unknown) => {
      return {
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorResponse(err),
        value: defaultValue,
      };
    })
  }

  resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    transformedContext: EvaluationContext
  ): Promise<ResolutionDetails<string>> {
    if (!this.providerReady) {
      return Promise.resolve({
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: this.connectionError ? ERROR_CONNECTION_ERROR : ErrorCode.PROVIDER_NOT_READY
      })
    }
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache.get(reqHash) != undefined) {
      return Promise.resolve(this.cache.get(reqHash) as ResolutionDetails<string>)
    }
    return this.promiseClient.resolveString({
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }).then((res) => {
      const resDetails = {
        value: res.value,
        reason: res.reason,
        variant: res.variant,
      }
      if (this.cacheActive) {
        this.cache.set(reqHash, resDetails)
      }
      return resDetails
    }).catch((err: unknown) => {
      return {
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorResponse(err),
        value: defaultValue,
      };
    })
  }

  resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    transformedContext: EvaluationContext
  ): Promise<ResolutionDetails<number>> {
    if (!this.providerReady) {
      return Promise.resolve({
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: this.connectionError ? ERROR_CONNECTION_ERROR : ErrorCode.PROVIDER_NOT_READY
      })
    }
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache.get(reqHash) != undefined) {
      return Promise.resolve(this.cache.get(reqHash) as ResolutionDetails<number>)
    }
    return this.promiseClient.resolveFloat({
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }).then((res) => {
      const resDetails = {
        value: res.value,
        reason: res.reason,
        variant: res.variant,
      }
      if (this.cacheActive) {
        this.cache.set(reqHash, resDetails)
      }
      return resDetails
    }).catch((err: unknown) => {
      return {
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorResponse(err),
        value: defaultValue,
      };
    })
  }

  resolveObjectEvaluation<U extends JsonValue>(
    flagKey: string,
    defaultValue: U,
    transformedContext: EvaluationContext
  ): Promise<ResolutionDetails<U>> {
    if (!this.providerReady) {
      return Promise.resolve({
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: this.connectionError ? ERROR_CONNECTION_ERROR : ErrorCode.PROVIDER_NOT_READY
      })
    }
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache.get(reqHash) != undefined) {
      return Promise.resolve(this.cache.get(reqHash) as ResolutionDetails<U>)
    }
    return this.promiseClient.resolveObject({
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }).then((res) => {
      if (res.value) {
        const resDetails = {
          value: JSON.parse(res.value.toJsonString()) as U,
          reason: res.reason,
          variant: res.variant,
        }
        if (this.cacheActive) {
        this.cache.set(reqHash, resDetails)
      }
        return resDetails
      }
      return {
        value: defaultValue,
        reason: res.reason,
        variant: res.variant,
      }
    }).catch((err: unknown) => {
      return {
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorResponse(err),
        value: defaultValue,
      };
    })
  }
}

function ErrorResponse(err: unknown): string {
  err as Partial<ConnectError>
  switch ((err as Partial<ConnectError>).code) {
    case Code.NotFound:
      return ErrorCode.FLAG_NOT_FOUND
    case Code.InvalidArgument:
      return ErrorCode.TYPE_MISMATCH
    case Code.Unavailable:
        return ERROR_DISABLED
    case Code.DataLoss:
        return ERROR_PARSE_ERROR
    default:
      return ERROR_UNKNOWN
  }
}
