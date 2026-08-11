# OpenAI Starter for NodeBoot - User Guide

## Introduction

The `@nodeboot/starter-openai` package enables seamless integration of [OpenAI](https://openai.com/) into NodeBoot-based applications. It provides a structured way to configure the OpenAI client using dependency injection (DI) and `app-config.yaml`.

> This package can be used with any AI platform compatible with OpenAI, by providing the respective platform API url and key.

## Installation

To use the OpenAI starter in your project, install it via npm or yarn:

```sh
npm install openai @nodeboot/starter-openai
```

or

```sh
pnpm add openai @nodeboot/starter-openai
```

## Configuration

### 1. Define OpenAI Configuration in `app-config.yaml`

Ensure that your `app-config.yaml` file includes the necessary OpenAI integration settings:

```yaml
integrations:
    openai:
        apiKey: ${OPENAI_API_KEY}
        organization: "your-org-id"
        project: "your-project-id"
        baseURL: "https://api.openai.com/v1/"
        timeout: 5000
        maxRetries: 2
```

-   `apiKey`: Your OpenAI API key (required).
-   `organization`: Your OpenAI organization ID (optional).
-   `project`: OpenAI project ID (optional).
-   `baseURL`: Custom base URL for the API (defaults to OpenAI's endpoint).
-   `timeout`: Request timeout in milliseconds.
-   `maxRetries`: Maximum number of retry attempts for failed requests.

### 2. Enable OpenAI in Your Application

In your main application class, use the `@EnableOpenAI()` decorator to enable OpenAI integration:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/scan";
import {EnableOpenAI} from "@nodeboot/starter-openai";

@EnableDI(Container)
@EnableOpenAI()
@EnableComponentScan()
@NodeBootApplication()
export class MyApplication implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

### 3. Inject OpenAI Client into Your Services

Once enabled, you can inject the OpenAI client into your services to interact with OpenAI's APIs:

```typescript
import {Inject, Service} from "@nodeboot/core";
import OpenAI from "openai";

@Service()
export class MyService {
    constructor(private readonly openAiClient: OpenAI) {}

    async generateText(prompt: string): Promise<string> {
        const response = await this.openAiClient.chat.completions.create({
            model: "gpt-4",
            messages: [{role: "user", content: prompt}],
            max_tokens: 100,
        });
        return response.choices[0].message.content;
    }
}
```

## Supporting Multiple OpenAI-Compatible Clients in the Same App

`@EnableOpenAI()` registers a single, unnamed `OpenAI` bean from the `integrations.openai` config path — that's enough when your app talks to exactly one OpenAI-compatible endpoint. Many real applications need more than one: a fast/cheap model for lightweight tasks, a separate vision-capable client, and one or more self-hosted/OpenAI-compatible endpoints (e.g. Llama served through an OpenAI-compatible gateway), each with its own API key and `baseURL`.

Instead of `@EnableOpenAI()`, define your own `@Configuration()` class with one `@Bean("name")` per client. Each bean reads its own section from `app-config.yaml` and constructs an `OpenAI` instance exactly like `OpenAIConfiguration` does internally, but registers it under a **named** bean instead of the default unnamed one.

### 1️⃣ Define a named-bean configuration class

```typescript
import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import OpenAI from "openai";

@Configuration()
export class AiClientsConfiguration {
    @Bean("gpt4-mini")
    public gpt4Mini({logger, config}: BeansContext): OpenAI {
        logger.info(`Creating GPT-4 Mini AI client`);

        const apiKey = config.getString("integrations.openai.apiKey");
        return new OpenAI({
            apiKey,
        });
    }

    @Bean("vision-ai")
    public visionAI({logger, config}: BeansContext): OpenAI {
        logger.info(`Creating OpenAI Vision AI client`);

        const apiKey = config.getString("integrations.visionai.apiKey");
        return new OpenAI({apiKey});
    }

    @Bean("llama3.1-ai")
    public llama3_1({logger, config}: BeansContext): OpenAI {
        logger.info(`Creating Llama 3.1 AI client`);

        const apiKey = config.getString("integrations.llama31.apiKey");
        const baseURL = config.getString("integrations.llama31.baseURL");
        return new OpenAI({
            baseURL,
            apiKey,
            defaultHeaders: {
                "Content-Type": "application/json",
            },
        });
    }

    @Bean("llama3.3-ai")
    public llama3_3({logger, config}: BeansContext): OpenAI {
        logger.info(`Creating Llama 3.3 AI client`);

        const apiKey = config.getString("integrations.llama33.apiKey");
        const baseURL = config.getString("integrations.llama33.baseURL");
        return new OpenAI({
            baseURL,
            apiKey,
        });
    }
}
```

Each `@Bean("name")` reads its own independent config path (`integrations.openai`, `integrations.visionai`, `integrations.llama31`, `integrations.llama33`, ...), so every client can point at a different provider/endpoint with its own API key and `baseURL`:

```yaml
integrations:
    openai:
        apiKey: ${OPENAI_API_KEY}
    visionai:
        apiKey: ${VISION_AI_API_KEY}
    llama31:
        apiKey: ${LLAMA31_API_KEY}
        baseURL: "https://your-llama31-gateway/v1/"
    llama33:
        apiKey: ${LLAMA33_API_KEY}
        baseURL: "https://your-llama33-gateway/v1/"
```

### 2️⃣ Inject each client by name

Because these beans were registered under a **name** (`"gpt4-mini"`, `"vision-ai"`, `"llama3.1-ai"`, `"llama3.3-ai"`) instead of the `OpenAI` class itself, they must be injected the same way — with `@Inject("name")` — not with plain constructor-type injection.

```typescript
import {Inject, Service} from "@nodeboot/core";
import OpenAI from "openai";

@Service()
export class MultiModelService {
    constructor(
        @Inject("gpt4-mini")
        private readonly gpt4Mini: OpenAI,
        @Inject("vision-ai")
        private readonly visionAI: OpenAI,
        @Inject("llama3.1-ai")
        private readonly llama31: OpenAI,
    ) {}

    async summarize(prompt: string) {
        const response = await this.gpt4Mini.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{role: "user", content: prompt}],
        });
        return response.choices[0].message.content;
    }

    async describeImage(imageUrl: string) {
        const response = await this.visionAI.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {type: "text", text: "Describe this image."},
                        {type: "image_url", image_url: {url: imageUrl}},
                    ],
                },
            ],
        });
        return response.choices[0].message.content;
    }
}
```

> ⚠️ **Important:** once a bean is registered under a name (`@Bean("some-name")`), it can **only** be resolved via that same name (`@Inject("some-name")`). Plain type-based injection (`@Inject()` or a bare constructor parameter of type `OpenAI`) will **not** resolve a named bean — it only works for the single, unnamed client registered by `@EnableOpenAI()`. If you switch from `@EnableOpenAI()` to your own named `@Configuration()` class, update every existing `private readonly openAiClient: OpenAI` injection to use `@Inject("your-bean-name")` accordingly.

### When to use this pattern

-   You call multiple OpenAI-compatible providers/models (e.g. a cheap model for simple tasks, a vision-capable model for images, self-hosted Llama models) from the same service.
-   Each client needs a different `apiKey`/`baseURL`/timeout, so a single `integrations.openai` config section isn't enough.
-   You still get the same DI/config benefits as `@EnableOpenAI()` — just with full control over how many clients exist and how they're named.

## Verifying the Integration

1. Ensure your `app-config.yaml` contains the correct OpenAI API key and settings.
2. Run your NodeBoot application (`pnpm start`).
3. Check logs to confirm the OpenAI client was successfully configured.

## Troubleshooting

### Issue: "OpenAI client was not created"

**Solution:** Ensure that `app-config.yaml` includes the `integrations.openai` section with the correct `apiKey` and `baseURL`.

### Issue: "401 Unauthorized when accessing OpenAI API"

**Solution:** Verify that the API key is correctly set and has the required permissions.

## Conclusion

The `@nodeboot/starter-openai` package simplifies OpenAI integration in NodeBoot applications. By following this guide, you can configure and use OpenAI effectively within your services.

For more details, refer to the official [OpenAI API documentation](https://platform.openai.com/docs).
