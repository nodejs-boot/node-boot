import http, {IncomingMessage, ServerResponse} from "node:http";
import crypto from "node:crypto";

function md5(data: string): string {
    return crypto.createHash("md5").update(data, "utf8").digest("hex");
}

export interface AwsMockState {
    s3Objects: Map<string, {body: string; contentType: string}>;
    dynamoItems: Map<string, any>;
    secrets: Map<string, string>;
    sqsMessages: Array<{messageId: string; body: string; receiptHandle: string}>;
    publishedSnsMessages: Array<{topicArn?: string; message: string; messageId: string}>;
    sentSqsMessages: Array<{queueUrl?: string; messageBody: string; messageId: string}>;
}

export interface AwsMockServerHandle {
    server: http.Server;
    port: number;
    endpoint: string;
    state: AwsMockState;
    pushSqsMessage: (body: any) => void;
    close: () => Promise<void>;
}

export function createAwsMockServer(port = 0): AwsMockServerHandle {
    const state: AwsMockState = {
        s3Objects: new Map(),
        dynamoItems: new Map(),
        secrets: new Map([["test-secret", JSON.stringify({apiKey: "super-secret-key"})]]),
        sqsMessages: [],
        publishedSnsMessages: [],
        sentSqsMessages: [],
    };

    const pushSqsMessage = (body: any) => {
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        state.sqsMessages.push({
            messageId,
            body: bodyStr,
            receiptHandle: `receipt-${messageId}`,
        });
    };

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString("utf-8");
        const contentType = req.headers["content-type"] || "";
        const target = (req.headers["x-amz-target"] as string) || "";
        const url = req.url || "/";
        const cleanPath = url.split("?")[0] || "/";
        const isJson =
            contentType.includes("application/x-amz-json") || contentType.includes("application/json") || target !== "";

        // 1. DYNAMODB (x-amz-target: DynamoDB_20120810.*)
        if (target.startsWith("DynamoDB_20120810.")) {
            const action = target.split(".")[1] || "";
            const body = rawBody ? JSON.parse(rawBody) : {};

            res.setHeader("Content-Type", "application/x-amz-json-1.0");

            if (action === "ListTables") {
                res.writeHead(200);
                res.end(JSON.stringify({TableNames: ["users", "products"]}));
                return;
            }
            if (action === "CreateTable") {
                res.writeHead(200);
                res.end(
                    JSON.stringify({
                        TableDescription: {
                            TableName: body.TableName || "test-table",
                            TableStatus: "ACTIVE",
                        },
                    }),
                );
                return;
            }
            if (action === "PutItem") {
                const key = body.TableName + ":" + JSON.stringify(body.Item?.id || body.Item);
                state.dynamoItems.set(key, body.Item);
                res.writeHead(200);
                res.end(JSON.stringify({Attributes: body.Item || {}}));
                return;
            }
            if (action === "GetItem") {
                const key = body.TableName + ":" + JSON.stringify(body.Key?.id || body.Key);
                const item = state.dynamoItems.get(key) || {
                    id: body.Key?.id || {S: "123"},
                    name: {S: "Sample Item"},
                };
                res.writeHead(200);
                res.end(JSON.stringify({Item: item}));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({}));
            return;
        }

        // 2. SECRETS MANAGER (x-amz-target: secretsmanager.*)
        if (target.startsWith("secretsmanager.")) {
            const action = target.split(".")[1] || "";
            const body = rawBody ? JSON.parse(rawBody) : {};

            res.setHeader("Content-Type", "application/x-amz-json-1.1");

            if (action === "GetSecretValue") {
                const secretName = body.SecretId || "test-secret";
                const secretString = state.secrets.get(secretName) || JSON.stringify({apiKey: "default-secret"});
                res.writeHead(200);
                res.end(
                    JSON.stringify({
                        ARN: `arn:aws:secretsmanager:eu-central-1:123456789012:secret:${secretName}`,
                        Name: secretName,
                        SecretString: secretString,
                        VersionId: "v1",
                    }),
                );
                return;
            }
            if (action === "CreateSecret") {
                const secretName = body.Name || "new-secret";
                state.secrets.set(secretName, body.SecretString || "");
                res.writeHead(200);
                res.end(
                    JSON.stringify({
                        ARN: `arn:aws:secretsmanager:eu-central-1:123456789012:secret:${secretName}`,
                        Name: secretName,
                    }),
                );
                return;
            }
            if (action === "ListSecrets") {
                const secretList = Array.from(state.secrets.keys()).map(name => ({
                    ARN: `arn:aws:secretsmanager:eu-central-1:123456789012:secret:${name}`,
                    Name: name,
                }));
                res.writeHead(200);
                res.end(JSON.stringify({SecretList: secretList}));
                return;
            }

            res.writeHead(200);
            res.end(JSON.stringify({}));
            return;
        }

        // 3. SQS (x-amz-target: AmazonSQS.* or Action in query/body)
        const isSqs =
            target.startsWith("AmazonSQS.") ||
            rawBody.includes("Action=SendMessage") ||
            rawBody.includes("Action=ReceiveMessage") ||
            rawBody.includes("Action=DeleteMessage") ||
            rawBody.includes("Action=CreateQueue") ||
            url.includes("queue");

        if (isSqs) {
            let action: string;
            let bodyObj: any;
            if (target.startsWith("AmazonSQS.")) {
                action = target.split(".")[1] || "";
                bodyObj = rawBody ? JSON.parse(rawBody) : {};
            } else {
                const params = new URLSearchParams(rawBody || url.split("?")[1] || "");
                action = params.get("Action") || "";
                bodyObj = Object.fromEntries(params.entries());
            }

            if (action === "SendMessage") {
                const messageId = `sqs-${Date.now()}`;
                const messageBody = bodyObj.MessageBody || bodyObj.messageBody || "";
                state.sentSqsMessages.push({
                    queueUrl: bodyObj.QueueUrl || bodyObj.queueUrl,
                    messageBody,
                    messageId,
                });

                const bodyMd5 = md5(messageBody);

                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(
                        JSON.stringify({
                            MessageId: messageId,
                            MD5OfMessageBody: bodyMd5,
                        }),
                    );
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    res.end(`<?xml version="1.0"?>
                        <SendMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
                            <SendMessageResult>
                                <MD5OfMessageBody>${bodyMd5}</MD5OfMessageBody>
                                <MessageId>${messageId}</MessageId>
                            </SendMessageResult>
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </SendMessageResponse>`);
                    return;
                }
            }

            if (action === "ReceiveMessage") {
                const msg = state.sqsMessages.shift();
                const messages = msg ? [msg] : [];

                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(
                        JSON.stringify({
                            Messages: messages.map(m => ({
                                MessageId: m.messageId,
                                ReceiptHandle: m.receiptHandle,
                                MD5OfBody: md5(m.body),
                                Body: m.body,
                            })),
                        }),
                    );
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    const msgXml = messages
                        .map(
                            m => `
                            <Message>
                                <MessageId>${m.messageId}</MessageId>
                                <ReceiptHandle>${m.receiptHandle}</ReceiptHandle>
                                <MD5OfBody>${md5(m.body)}</MD5OfBody>
                                <Body><![CDATA[${m.body}]]></Body>
                            </Message>`,
                        )
                        .join("\n");
                    res.end(`
                        <?xml version="1.0"?>
                        <ReceiveMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
                            <ReceiveMessageResult>
                                ${msgXml}
                            </ReceiveMessageResult>
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </ReceiveMessageResponse>`);
                    return;
                }
            }

            if (action === "DeleteMessage") {
                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(JSON.stringify({}));
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    res.end(`<?xml version="1.0"?>
                        <DeleteMessageResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </DeleteMessageResponse>`);
                    return;
                }
            }

            if (action === "CreateQueue") {
                const host = req.headers["host"] || "127.0.0.1";
                const queueUrl = `http://${host}/123456789012/test-queue`;
                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(JSON.stringify({QueueUrl: queueUrl}));
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    res.end(`<?xml version="1.0"?>
                        <CreateQueueResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/">
                            <CreateQueueResult><QueueUrl>${queueUrl}</QueueUrl></CreateQueueResult>
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </CreateQueueResponse>`);
                    return;
                }
            }

            res.writeHead(200);
            res.end(isJson ? "{}" : "<Response/>");
            return;
        }

        // 4. SNS (Action=Publish or Action=CreateTopic or target AmazonSNS.*)
        const isSns =
            target.startsWith("AmazonSNS.") ||
            rawBody.includes("Action=Publish") ||
            rawBody.includes("Action=CreateTopic") ||
            rawBody.includes("Action=ListTopics");

        if (isSns) {
            let action: string;
            let bodyObj: any;
            if (target.startsWith("AmazonSNS.")) {
                action = target.split(".")[1] || "";
                bodyObj = rawBody ? JSON.parse(rawBody) : {};
            } else {
                const params = new URLSearchParams(rawBody || url.split("?")[1] || "");
                action = params.get("Action") || "";
                bodyObj = Object.fromEntries(params.entries());
            }

            if (action === "Publish") {
                const messageId = `sns-${Date.now()}`;
                state.publishedSnsMessages.push({
                    topicArn: bodyObj.TopicArn || bodyObj.topicArn,
                    message: bodyObj.Message || bodyObj.message || "",
                    messageId,
                });

                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(JSON.stringify({MessageId: messageId}));
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    res.end(`<?xml version="1.0"?>
                        <PublishResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
                            <PublishResult><MessageId>${messageId}</MessageId></PublishResult>
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </PublishResponse>`);
                    return;
                }
            }

            if (action === "CreateTopic") {
                const topicArn = "arn:aws:sns:eu-central-1:123456789012:test-topic";
                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(JSON.stringify({TopicArn: topicArn}));
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    res.end(`<?xml version="1.0"?>
                        <CreateTopicResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
                            <CreateTopicResult><TopicArn>${topicArn}</TopicArn></CreateTopicResult>
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </CreateTopicResponse>`);
                    return;
                }
            }

            if (action === "ListTopics") {
                const topicArn = "arn:aws:sns:eu-central-1:123456789012:test-topic";
                if (isJson) {
                    res.setHeader("Content-Type", "application/x-amz-json-1.0");
                    res.writeHead(200);
                    res.end(JSON.stringify({Topics: [{TopicArn: topicArn}]}));
                    return;
                } else {
                    res.setHeader("Content-Type", "application/xml");
                    res.writeHead(200);
                    res.end(`<?xml version="1.0"?>
                        <ListTopicsResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
                            <ListTopicsResult><Topics><member><TopicArn>${topicArn}</TopicArn></member></Topics></ListTopicsResult>
                            <ResponseMetadata><RequestId>mock-req</RequestId></ResponseMetadata>
                        </ListTopicsResponse>`);
                    return;
                }
            }

            res.writeHead(200);
            res.end(isJson ? "{}" : "<Response/>");
            return;
        }

        // 5. S3 (REST XML Protocol)
        if (req.method === "GET" && (cleanPath === "/" || cleanPath === "")) {
            // ListBuckets
            res.setHeader("Content-Type", "application/xml");
            res.writeHead(200);
            res.end(`<?xml version="1.0" encoding="UTF-8"?>
<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <Owner><ID>owner1</ID><DisplayName>owner1</DisplayName></Owner>
    <Buckets>
        <Bucket><Name>test-bucket</Name><CreationDate>2026-01-01T00:00:00.000Z</CreationDate></Bucket>
    </Buckets>
</ListAllMyBucketsResult>`);
            return;
        }

        if (req.method === "PUT" && cleanPath.split("/").filter(Boolean).length === 1) {
            // CreateBucket
            res.setHeader("Location", cleanPath);
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === "PUT") {
            // PutObject
            const key = cleanPath.replace(/^\//, "");
            state.s3Objects.set(key, {
                body: rawBody,
                contentType: (req.headers["content-type"] as string) || "application/octet-stream",
            });
            res.setHeader("ETag", '"mock-etag-123"');
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === "GET") {
            // GetObject
            const key = cleanPath.replace(/^\//, "");
            const obj = state.s3Objects.get(key) ||
                state.s3Objects.get(key.split("/").slice(1).join("/")) || {
                    body: "Hello from S3 mock",
                    contentType: "text/plain",
                };
            res.setHeader("Content-Type", obj.contentType);
            res.setHeader("ETag", '"mock-etag-123"');
            res.writeHead(200);
            res.end(obj.body);
            return;
        }

        res.writeHead(404);
        res.end("Not Found");
    });

    server.listen(port);

    return {
        server,
        port,
        endpoint: `http://127.0.0.1:${port}`,
        state,
        pushSqsMessage,
        close: () =>
            new Promise<void>(resClose => {
                server.close(() => resClose());
            }),
    };
}

export function startAwsMockServer(port = 0): Promise<AwsMockServerHandle> {
    return new Promise(resolve => {
        const handle = createAwsMockServer(port);
        if (handle.server.listening) {
            resolve(handle);
        } else {
            handle.server.once("listening", () => {
                const addr = handle.server.address() as any;
                handle.port = addr.port;
                handle.endpoint = `http://127.0.0.1:${addr.port}`;
                resolve(handle);
            });
        }
    });
}
