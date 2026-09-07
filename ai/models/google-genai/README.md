# @nodeboot/ai-google-genai

Google GenAI (Gemini) model adapters for Node-Boot AI, covering 3 Spring-AI-style model categories:

-   **Chat** — `GoogleGenAiChatModel` (`ChatModel`)
-   **Embedding** — `GoogleGenAiEmbeddingModel` (`EmbeddingModel`)
-   **Image** — `GoogleGenAiImageModel` (`ImageModel`, Imagen)

## Usage

```typescript
import {EnableAi} from "@nodeboot/ai-core";
import {EnableGoogleGenAiModels} from "@nodeboot/ai-google-genai";

@EnableAi()
@EnableGoogleGenAiModels()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

Each model is registered in the DI container by its concrete class (e.g. `GoogleGenAiChatModel`,
`GoogleGenAiEmbeddingModel`, `GoogleGenAiImageModel`), so you can inject it directly with a typed constructor
parameter — see the "Injecting the Registered Models" section below.

### In `app-config.yaml`:

```yaml
ai:
    google-genai:
        apiKey: "YOUR_GOOGLE_GENAI_API_KEY"
        chat:
            options:
                model: "gemini-2.0-flash"
                temperature: 0.7
        embedding:
            options:
                model: "text-embedding-004"
        image:
            options:
                model: "imagen-3.0-generate-002"
                n: 1
```

## Injecting the Registered Models into Your Services

Enabling this package registers every supported model in the DI container by its concrete class (`GoogleGenAiChatModel`, `GoogleGenAiEmbeddingModel`, `GoogleGenAiImageModel`), plus a default `ChatClient` (as `ChatClient`). Inject them into any `@Service`/`@Controller` simply as a constructor parameter typed with the class (Node-Boot resolves it via reflection, no decorator needed), or with `@Inject()`:

```typescript
import {Inject, Service} from "@nodeboot/core";
import {ChatClient} from "@nodeboot/ai-core";
import {GoogleGenAiChatModel, GoogleGenAiEmbeddingModel, GoogleGenAiImageModel} from "@nodeboot/ai-google-genai";

@Service()
export class MyAiService {
    constructor(
        // Inject any provider model directly by its concrete class — Node-Boot
        // resolves it via reflection, no decorator needed for class-based injection
        private readonly chatModel: GoogleGenAiChatModel,
        private readonly googleGenAiEmbeddingModel: GoogleGenAiEmbeddingModel,
        private readonly googleGenAiImageModel: GoogleGenAiImageModel,
        // The default ChatClient is also ready to use out of the box
        @Inject() private readonly chatClient: ChatClient,
    ) {}

    async askDirectly(question: string) {
        // Using the raw ChatModel (lower-level, closer to the provider API)
        const response = await this.chatModel.call({
            getInstructions: () => [{messageType: "user", text: question}],
        } as any);
        return response.result.message.text;
    }
}
```

## Using the Fluent `ChatClient` API

The default `ChatClient` registered by this package is the recommended, higher-level way to talk to
`GoogleGenAiChatModel` — it supports fluent prompt building, `{param}` templating, structured output parsing, default
tools/advisors, and automatic multi-turn tool-calling:

```typescript
import {Inject, Service} from "@nodeboot/core";
import {ChatClient} from "@nodeboot/ai-core";

@Service()
export class AssistantService {
    constructor(@Inject() private readonly chatClient: ChatClient) {}

    async askWeather(city: string): Promise<string> {
        return this.chatClient
            .prompt()
            .system("You are a concise, helpful assistant.")
            .user("What is the weather like in {city}?")
            .param("city", city)
            .call()
            .content();
    }

    async askStructured(city: string) {
        // Parse the model's response straight into a typed object
        return this.chatClient
            .prompt()
            .user(`Return the current weather in {city} as JSON with "city" and "tempCelsius" fields.`)
            .call()
            .entity<{city: string; tempCelsius: number}>();
    }
}
```

### Automatic `@Tool` calling

Any method decorated with `@Tool(...)` on a `@Service`/`@Component` bean is automatically discovered and
registered in the global `ToolRegistry` (enabled by `@EnableAi()`). `ChatClient.create(...)` (used internally by
this package's auto-configuration) wires that registry in by default, so the model can call your tools directly
— no extra wiring required:

```typescript
import {Service} from "@nodeboot/core";
import {Tool} from "@nodeboot/ai-core";

@Service()
export class WeatherTool {
    @Tool({
        description: "Get the current weather for a city",
        inputSchema: {
            type: "object",
            properties: {city: {type: "string"}},
            required: ["city"],
        },
    })
    getWeather(input: {city: string}) {
        return {city: input.city, tempCelsius: 18, condition: "Cloudy"};
    }
}

// Elsewhere, any ChatClient.prompt().user("What's the weather in Lisbon?").call() can now
// transparently call `getWeather` as part of answering the question.
```

## Combining with MCP (Model Context Protocol)

Because every `@Tool`-decorated method is registered in the shared `ToolRegistry`, you get MCP support for
free by adding [`@nodeboot/mcp`](https://github.com/nodejs-boot/node-boot/blob/main/ai/mcp/README.md) to the
same application:

```typescript
import {NodeBootApplication, NodeBootApp} from "@nodeboot/core";
import {EnableAi} from "@nodeboot/ai-core";
import {EnableMcp} from "@nodeboot/mcp";
import {NodeBoot} from "@nodeboot/engine";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableGoogleGenAiModels} from "@nodeboot/ai-google-genai";

@EnableAi()
@EnableGoogleGenAiModels()
@EnableMcp() // expose every @Tool as a real MCP server, and/or consume external MCP tool servers
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

-   **As an MCP server**: `@EnableMcp()` with `mcp.server.enabled: true` in `app-config.yaml` exposes every
    `@Tool` in your app (including tools that call this package's `GoogleGenAiChatModel`-backed `ChatClient`) to external
    MCP clients like Claude Desktop or IDE agents.
-   **As an MCP client**: configure `mcp.clients` to connect to external MCP servers — their tools are merged
    into the same `ToolRegistry` and become callable by this package's `ChatClient` exactly like local `@Tool`s.

See the [`@nodeboot/mcp` README](https://github.com/nodejs-boot/node-boot/blob/main/ai/mcp/README.md) for the
full client/server/`app-config.yaml` reference.
