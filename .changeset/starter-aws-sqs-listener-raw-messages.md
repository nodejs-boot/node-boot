---
"@nodeboot/starter-aws": minor
---

`@SqsListener` now works with any SQS queue, not only with messages delivered by SNS.

-   Messages sent straight to the queue are passed to the handler as they are: `message` is the parsed body, `messageId` the SQS message id and `timestamp` its `SentTimestamp`. Before, every message that was not an SNS notification failed and stayed on the queue. SNS notifications are still unwrapped as before. A body that is not JSON is passed as a string instead of failing. The envelope also carries the received SQS message as `raw`.
-   FIFO queues (`.fifo`) and local emulators (LocalStack, ElasticMQ) are accepted: a queue URL is any `http(s)` URL with the path `/<account id>/<queue name>`. A new `integrations.aws.sqs.endpoint` setting points the SQS client at an emulator.
-   `@SqsListener(queueUrl, options)` takes consumer options: `batchSize`, `waitTimeSeconds`, `visibilityTimeout`, `pollingWaitTimeMs`, `handleMessageTimeout`, `terminateVisibilityTimeout`, `attributeNames`, `messageSystemAttributeNames`, `messageAttributeNames`.
-   Listeners stop polling on application shutdown. `stopSqsListeners()`, `SqsListenerAdapter` and `SqsListenerOptions` are exported from the package root.
