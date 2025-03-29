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
import {Inject, Service} from "typedi";
import OpenAI from "openai";

@Service()
export class MyService {
    constructor(@Inject(() => OpenAI) private readonly openAiClient: OpenAI) {}

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
