---
name: nodeboot-starter-aws
description: Use when the user wants AWS integrations in a Node-Boot app with `@nodeboot/starter-aws`; this starter is enabled with `@EnableAws()` and auto-configures conditional AWS SDK v3 clients such as S3, SQS, SNS, DynamoDB, and Secrets Manager from `integrations.aws` settings.
---

# `@nodeboot/starter-aws`

Use this starter when a Node-Boot service should inject AWS SDK clients instead of constructing them manually. `@EnableAws()` turns on config-driven client registration, and `@SqsListener(...)` is the extra decorator to remember when consuming queue messages.

## Enable

```ts
@EnableDI(Container)
@EnableAws()
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Key config

```yaml
integrations:
    aws:
        credentials:
            accessKeyId: "${AWS_ACCESS_KEY_ID}"
            secretAccessKey: "${AWS_SECRET_ACCESS_KEY}"
        s3:
            region: "eu-central-1"
        sqs:
            region: "eu-central-1"
```

Add only the client sections you need: `dynamodb`, `s3`, `secrets`, `sns`, and `sqs` are created conditionally from config.

Full docs: [`starters/aws/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/aws/README.md)

## Validate

`cd starters/aws && pnpm test`

For automated proof that `@EnableAws()` actually autowires, see `test/aws-s3-enabled.it.test.ts` /
`test/aws-s3-disabled.it.test.ts`: a `useNodeBoot()`-booted app (on `@nodeboot/ghost-server`)
asserting a real `S3Client` is registered when `integrations.aws.s3.region` is configured, and
absent when it isn't. Constructing an AWS SDK v3 client never makes a network call by itself, so
this needs no real credentials. See `nodeboot-extending-nodeboot`'s "Testing a starter package"
section before writing this style of test for a different starter.
