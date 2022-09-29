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

export const ERROR_PARSE_ERROR = "PARSE_ERROR"
export const ERROR_DISABLED = "DISABLED"
export const ERROR_UNKNOWN = "UNKNOWN"

export interface FlagdWebProviderOptions {
  host?: string;
  port?: number;
  protocol?: string;
  cache?: boolean;
  cacheTTL?: number;
  cacheMaxKeys?: number;
}

interface Cache {
  [key: string]: ResolutionDetails<JsonValue|boolean|number|string>
}

const EVENT_CONFIGURATION_CHANGE = "configuration_change";
const EVENT_PROVIDER_READY = "provider_ready";

export class FlagdWebProvider {
  metadata = {
    name: 'flagD Provider',
  };

  promiseClient: PromiseClient<typeof Service>
  callbackClient: CallbackClient<typeof Service>

  cache: Cache
  cacheActive: boolean

  constructor(options?: FlagdWebProviderOptions) {
    const {host, port, protocol, cache}: FlagdWebProviderOptions = {
      host: "localhost",
      port: 8013,
      protocol: "http",
      cache: false,
      ...options
    };
    const transport = createConnectTransport({
      baseUrl: `${protocol}://${host}:${port}`
    });
    this.promiseClient = createPromiseClient(Service, transport);
    this.callbackClient = createCallbackClient(Service, transport);
    this.cache = {}
    this.cacheActive = cache

    this.callbackClient.eventStream(
      {},
      (message) => {
        console.log(`event received: ${message.type}`);
        switch (message.type) {
          case EVENT_CONFIGURATION_CHANGE:
            console.log("configuration change: busting cache");
            this.cache = {}
        }
      },
      (err) => {
        console.log(err);
      },
    )
  }

  resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    transformedContext: EvaluationContext
  ): Promise<ResolutionDetails<boolean>> {
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache[reqHash] != null) {
      return Promise.resolve(this.cache[reqHash] as ResolutionDetails<boolean>)
    }
    return this.promiseClient.resolveBoolean(req).then((res) => {
      const resDetails = {
        value: res.value,
        reason: res.reason,
        variant: res.variant,
      }
      if (this.cacheActive) {
        this.cache[reqHash] = resDetails
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
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache[reqHash] != null) {
      return Promise.resolve(this.cache[reqHash] as ResolutionDetails<string>)
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
        this.cache[reqHash] = resDetails
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
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache[reqHash] != null) {
      return Promise.resolve(this.cache[reqHash] as ResolutionDetails<number>)
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
        this.cache[reqHash] = resDetails
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
    const req = {
      flagKey,
      context: Struct.fromJsonString(JSON.stringify(transformedContext)),
    }
    const reqHash = sha1(req);
    if (this.cacheActive && this.cache[reqHash] != null) {
      return Promise.resolve(this.cache[reqHash] as ResolutionDetails<U>)
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
        this.cache[reqHash] = resDetails
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
