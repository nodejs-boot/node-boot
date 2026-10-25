import {JsonObject} from "@nodeboot/context";
import type {Message, MessageSystemAttributeName, QueueAttributeName} from "@aws-sdk/client-sqs";

/**
 * What an `@SqsListener` handler receives.
 *
 * - A message delivered by an SNS topic subscription (`{Type: "Notification", MessageId, Message, ...}`) is unwrapped:
 *   `messageId`, `timestamp` and `signature` are the notification's, `message` its `Message`.
 * - Any other body is the message itself: `messageId` is the SQS message id, `timestamp` its `SentTimestamp`
 *   attribute (when requested), `signature` empty.
 *
 * `message` is the JSON-parsed payload, or the string itself when it is not JSON. `raw` is the SQS message.
 */
export type MessageEnvelop<M = JsonObject> = {
    messageId: string;
    timestamp: string;
    signature: string;
    message: M;
    raw: Message;
};

/** Consumer options of one `@SqsListener` (see sqs-consumer's ConsumerOptions). */
export type SqsListenerOptions = {
    /** Messages received per poll and processed concurrently (1-10). Default 1. */
    batchSize?: number;
    /** Long-polling wait per receive (0-20 s). Default 20. */
    waitTimeSeconds?: number;
    /** Visibility timeout of received messages, in seconds. Default: the queue's. */
    visibilityTimeout?: number;
    /** Pause between polls, in ms. Default 0 when messages keep arriving. */
    pollingWaitTimeMs?: number;
    /** A handler running longer than this fails its message (left on the queue), in ms. Default: none. */
    handleMessageTimeout?: number;
    /** On a failure, make the message visible again after this many seconds (true: immediately). */
    terminateVisibilityTimeout?: boolean | number;
    attributeNames?: QueueAttributeName[];
    /** SentTimestamp is always requested. */
    messageSystemAttributeNames?: MessageSystemAttributeName[];
    messageAttributeNames?: string[];
};
