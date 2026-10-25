import {
    allowedProfiles,
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    extractPlaceholderKey,
    getActiveProfiles,
    Lifecycle,
    ShutdownHookContext,
} from "@nodeboot/context";
import {AWS_SQS_FEATURE} from "../types";
import {Message, SQSClient} from "@aws-sdk/client-sqs";
import {Consumer} from "sqs-consumer";
import {MessageEnvelop, SqsListenerOptions} from "./types";

type SqsListenerAdapterOptions = {
    target: any;
    listenerFunction: Function;
    queueUrlOrConfigPlaceholder: string;
    consumerOptions?: SqsListenerOptions;
};

/**
 * A queue URL's path: `/<12-digit account id>/<queue name>[.fifo]`, on any http(s) host. Covers AWS
 * (`https://sqs.<region>.amazonaws.com/...`, `.amazonaws.com.cn`, `.api.aws`) and local emulators such as LocalStack
 * or ElasticMQ (`http://localhost:4566/000000000000/my-queue`; set `integrations.aws.sqs.endpoint` for them).
 */
const SQS_QUEUE_PATH = /^\/(?<accountId>\d{12})\/(?<queueName>[a-zA-Z0-9_-]{1,80}(\.fifo)?)$/;

/** Stops polling on application shutdown, before other resources close. Registered once. */
let shutdownHookRegistered = false;

@Lifecycle("persistence.started")
export class SqsListenerAdapter implements ApplicationFeatureAdapter {
    public static consumers: Consumer[] = [];
    public consumer?: Consumer;
    private readonly options: SqsListenerAdapterOptions;

    constructor(options: SqsListenerAdapterOptions) {
        this.options = options;
    }

    /** Stops every consumer: no new receives; messages being handled finish (and are deleted when they succeed). */
    public static stopAll(): void {
        for (const consumer of SqsListenerAdapter.consumers) {
            try {
                consumer.stop();
            } catch {
                // ignore
            }
        }
        SqsListenerAdapter.consumers = [];
    }

    static isValidSqsUrl(url: string): boolean {
        try {
            const {protocol, pathname} = new URL(url);
            return (protocol === "https:" || protocol === "http:") && SQS_QUEUE_PATH.test(pathname);
        } catch {
            return false;
        }
    }

    /** The envelope of one SQS message: an SNS notification unwrapped, or the body itself. */
    static toEnvelop(msg: Message): MessageEnvelop<any> {
        const body = msg.Body ?? "";
        const parsed = parseJson(body);
        if (isSnsNotification(parsed)) {
            return {
                messageId: parsed.MessageId ?? msg.MessageId ?? "",
                signature: parsed.Signature ?? "",
                timestamp: parsed.Timestamp ?? "",
                message: parseJson(parsed.Message),
                raw: msg,
            };
        }
        const sent = msg.Attributes?.SentTimestamp;
        return {
            messageId: msg.MessageId ?? "",
            signature: "",
            timestamp: sent ? new Date(Number(sent)).toISOString() : "",
            message: parsed,
            raw: msg,
        };
    }

    private getQueueUrl(config: any, queueUrlOrConfigPlaceholder: string) {
        const configPlaceholder = extractPlaceholderKey(queueUrlOrConfigPlaceholder);
        if (configPlaceholder) {
            return config.getString(configPlaceholder);
        } else {
            return queueUrlOrConfigPlaceholder;
        }
    }

    bind({logger, iocContainer, config}: ApplicationFeatureContext): void {
        const {target, queueUrlOrConfigPlaceholder, listenerFunction, consumerOptions = {}} = this.options;
        const name = `${target.constructor.name}:::${listenerFunction.name}()`;

        // Check if SQS feature is enabled
        if (!ApplicationContext.get().applicationFeatures[AWS_SQS_FEATURE]) {
            logger.warn(`⏰ SqsListener ${name} with queueUrl ${queueUrlOrConfigPlaceholder}
            registered but AWS SQS is disabled. To enable AWS SQS, please decorate your Node-Boot application
            class with @EnableAws() and provide SQS region the configuration at "integrations.aws.sqs.region" config path.`);
            return;
        }
        // Check if the current active profiles allow this SQS listener
        // e.g., only register certain listeners in production or development environments.
        if (!allowedProfiles(target)) {
            logger.warn(`SqsListener ${name} with queueUrl ${queueUrlOrConfigPlaceholder}
                registered but the active profiles ${getActiveProfiles()} do not match the required profiles defined in the component/service class.`);
            return;
        }

        const queueUrl = this.getQueueUrl(config, queueUrlOrConfigPlaceholder);
        if (!SqsListenerAdapter.isValidSqsUrl(queueUrl)) {
            logger.warn(`Invalid SQS queue URL "${queueUrl}" for @SqsListener at function "${name}".
                 Please provide a valid URL in the format "https://sqs.aws-region.amazonaws.com/account-id/queue-name"`);
            return;
        }

        logger.info(`Registering SQS Listener "${queueUrl}" --> "${name}"`);
        // Retrieve the class instance (bean) from the DI container
        const componentBean = iocContainer.get(target.constructor);
        const sqsClient = iocContainer.get(SQSClient);

        const app = Consumer.create({
            pollingWaitTimeMs: 1000,
            ...consumerOptions,
            // The envelope's timestamp of a message that is not an SNS notification.
            messageSystemAttributeNames: [
                ...new Set([...(consumerOptions.messageSystemAttributeNames ?? []), "SentTimestamp" as const]),
            ],
            queueUrl,
            sqs: sqsClient,
            handleMessage: async msg => {
                await listenerFunction.call(componentBean, SqsListenerAdapter.toEnvelop(msg));
                // Acknowledged (deleted) only once the handler resolved.
                return msg;
            },
        });

        app.on("error", (err, msg) => {
            logger.error(`SQS Generic Error (${name}${messageIdOf(msg)}): ${err.message}`);
        });
        app.on("processing_error", (err, msg) => {
            logger.error(`SQS Processing Error (${name}${messageIdOf(msg)}): ${err.message}; left on the queue`);
        });
        app.on("timeout_error", (err, msg) => {
            logger.error(`SQS Timeout Error (${name}${messageIdOf(msg)}): ${err.message}; left on the queue`);
        });

        this.consumer = app;
        SqsListenerAdapter.consumers.push(app);
        registerShutdownHook();
        app.start();
    }
}

/** Stops every @SqsListener consumer. Also done automatically on application shutdown. */
export function stopSqsListeners(): void {
    SqsListenerAdapter.stopAll();
}

function registerShutdownHook(): void {
    if (shutdownHookRegistered) return;
    shutdownHookRegistered = true;
    // No constructor: the shutdown context cannot resolve it from the IoC container and calls this object directly.
    const target = Object.assign(Object.create(null), {stop: stopSqsListeners});
    ShutdownHookContext.get().addShutdownHook({target, methodName: "stop", priority: 1000, timeout: 10_000});
}

function parseJson(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/** An SNS → SQS delivery (raw message delivery off). `Type` is absent from some hand-built envelopes. */
function isSnsNotification(
    v: any,
): v is {Type?: string; MessageId?: string; Message: string; Signature?: string; Timestamp?: string} {
    return (
        v !== null &&
        typeof v === "object" &&
        typeof v.Message === "string" &&
        (v.Type === "Notification" || typeof v.MessageId === "string")
    );
}

function messageIdOf(msg: Message | Message[] | undefined): string {
    if (!msg) return "";
    const ids = (Array.isArray(msg) ? msg : [msg]).map(m => m.MessageId).filter(Boolean);
    return ids.length ? `, message ${ids.join(", ")}` : "";
}
