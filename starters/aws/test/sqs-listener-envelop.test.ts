/**
 * Unit tests of how @SqsListener reads queue URLs and SQS messages.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {SqsListenerAdapter} from "../src/adapter";

describe("@nodeboot/starter-aws - SqsListenerAdapter", () => {
    test("accepts AWS, FIFO and local emulator queue URLs", () => {
        for (const url of [
            "https://sqs.eu-west-1.amazonaws.com/123456789012/orders",
            "https://sqs.eu-west-1.amazonaws.com/123456789012/orders.fifo",
            "https://sqs.cn-north-1.amazonaws.com.cn/123456789012/orders",
            "http://localhost:4566/000000000000/orders",
            "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/orders.fifo",
        ])
            assert.equal(SqsListenerAdapter.isValidSqsUrl(url), true, url);
    });

    test("refuses URLs that are not a queue", () => {
        for (const url of [
            "http://invalid-queue-url/123",
            "https://sqs.eu-west-1.amazonaws.com/orders",
            "https://sqs.eu-west-1.amazonaws.com/123456789012/orders/extra",
            "ftp://host/123456789012/orders",
            "${not.resolved}",
            "",
        ])
            assert.equal(SqsListenerAdapter.isValidSqsUrl(url), false, url);
    });

    test("unwraps an SNS notification", () => {
        const envelop = SqsListenerAdapter.toEnvelop({
            MessageId: "sqs-1",
            Body: JSON.stringify({
                Type: "Notification",
                MessageId: "sns-1",
                Timestamp: "2026-10-25T10:00:00.000Z",
                Signature: "sig",
                Message: JSON.stringify({orderId: "o-1"}),
            }),
        });
        assert.deepEqual(
            {id: envelop.messageId, ts: envelop.timestamp, sig: envelop.signature, message: envelop.message},
            {id: "sns-1", ts: "2026-10-25T10:00:00.000Z", sig: "sig", message: {orderId: "o-1"}},
        );
        assert.equal(envelop.raw.MessageId, "sqs-1");
    });

    test("hands a raw SQS message over as it is", () => {
        const envelop = SqsListenerAdapter.toEnvelop({
            MessageId: "sqs-2",
            Body: JSON.stringify({orderId: "o-2"}),
            Attributes: {SentTimestamp: "1761386400000"},
        });
        assert.deepEqual(
            {id: envelop.messageId, ts: envelop.timestamp, sig: envelop.signature, message: envelop.message},
            {id: "sqs-2", ts: new Date(1761386400000).toISOString(), sig: "", message: {orderId: "o-2"}},
        );
    });

    test("passes a body that is not JSON as a string, never throwing", () => {
        assert.equal(SqsListenerAdapter.toEnvelop({MessageId: "sqs-3", Body: "plain text"}).message, "plain text");
        assert.equal(
            SqsListenerAdapter.toEnvelop({
                MessageId: "sqs-4",
                Body: JSON.stringify({Type: "Notification", Message: "hi"}),
            }).message,
            "hi",
        );
        assert.equal(SqsListenerAdapter.toEnvelop({MessageId: "sqs-5"}).message, "");
    });
});
