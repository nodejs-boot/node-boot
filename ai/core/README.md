# @nodeboot/ai-core

Spring AI port for Node-Boot: Portable AI abstractions, `ChatClient`, `PromptTemplate`, Structured Outputs, Multimodality, Chat Memory, Advisors, `@Tool` decorator calling, Vector Stores, RAG, and MCP (Model Context Protocol).

## Features

-   **Fluent ChatClient API**: Builder pattern, default advisors, fluent prompt/user/param calls.
-   **Prompts & Templating**: `PromptTemplate` with `{variable}` replacement and multimodal `Media` attachments.
-   **Structured Output**: `BeanOutputConverter`, `ListOutputConverter`, `MapOutputConverter` with schema validation.
-   **Chat Memory**: `ChatMemory`, `MessageWindowChatMemory`, `ChatMemoryRepository`, `InMemoryChatMemoryRepository`.
-   **Advisors Pipeline**: `MessageChatMemoryAdvisor`, `QuestionAnswerAdvisor` (RAG), `SafeGuardAdvisor`.
-   **Tool Calling**: `@Tool` method decorator on beans, automatic function registration and multi-turn execution.
-   **Vector Stores & RAG**: `VectorStore`, `SimpleVectorStore`, `Document`, `TextSplitter`, `EmbeddingModel`.
-   **MCP Integration**: `McpClient` bridge to expose MCP server tools directly to LLM pipelines.

## Usage

```typescript
import {EnableAi, ChatClient, Tool, Service} from "@nodeboot/ai-core";

@Service()
export class WeatherService {
    @Tool({
        description: "Get weather for a city",
        inputSchema: {
            type: "object",
            properties: {city: {type: "string"}},
            required: ["city"],
        },
    })
    getWeather(input: {city: string}) {
        return {city: input.city, temp: 21, condition: "Sunny"};
    }
}

// In your application / controller:
const response = await chatClient
    .prompt()
    .user("What is the weather in {city}?")
    .param("city", "London")
    .call()
    .content();
```

## Chat Memory

LLMs are stateless — they don't retain information about previous interactions. `ChatMemory`
lets you store and retrieve the messages that are relevant to the current conversation, so the
model keeps contextual awareness across multiple calls.

`ChatMemory` is distinct from _chat history_: chat memory is what gets fed back into the model
(a curated subset of messages), while chat history is the full record of everything exchanged. If
you need to keep a complete audit trail, persist it separately (e.g. via `@nodeboot/starter-persistence`)
rather than relying on `ChatMemory`.

Storage is split into two concerns:

-   **`ChatMemory`** decides _which_ messages to keep and when to evict them (the policy).
-   **`ChatMemoryRepository`** just persists and retrieves messages for a conversation id (the storage).

### `MessageWindowChatMemory`

The default `ChatMemory` implementation. It keeps a sliding window of at most `maxMessages`
messages per conversation (20 by default), always preserving `SystemMessage` instances. When the
window must evict messages, it never splits a turn in half: a turn starts at a `UserMessage` and
includes every assistant reply, tool call, and tool response up to (but excluding) the next
`UserMessage`. If the raw eviction point lands mid-turn, the cut snaps forward to the next
`UserMessage` so the retained window always starts at a complete turn.

`@EnableAi()` auto-configures a `MessageWindowChatMemory` bean (backed by an
`InMemoryChatMemoryRepository`) that's ready to inject wherever you need it — no manual
construction required. It's registered under the `"ChatMemory"` name (not the class), so inject it
with `@Inject("ChatMemory")` rather than a bare `@Inject()`. If you need to customize it (e.g. a
different `maxMessages`, or a database-backed repository), override the bean with your own
`@Configuration`/`@Bean` — the builder belongs in that configuration class, not in application code:

```typescript
import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {MessageWindowChatMemory} from "@nodeboot/ai-core";

@Configuration()
export class ChatMemoryConfig {
    @Bean()
    chatMemory({iocContainer}: BeansContext) {
        iocContainer.set(
            "ChatMemory",
            MessageWindowChatMemory.builder()
                .maxMessages(10)
                .chatMemoryRepository(iocContainer.get("ChatMemoryRepository")) // or your own repository
                .build(),
        );
    }
}
```

### Using memory with `ChatClient`

`MessageChatMemoryAdvisor` wires a `ChatMemory` into the `ChatClient` pipeline: on every call it
retrieves the conversation history and prepends it to the prompt, then persists the new user/assistant
messages back to memory.

The conversation id is required — there is no default. Provide it either with `.conversationId(...)`
or with `.param(ChatMemory.CONVERSATION_ID, ...)`; omitting it throws at call time.

Inject the auto-configured `ChatClient` and `ChatMemory` beans and attach the advisor per call with
`.advisors(...)`:

```typescript
import {Inject, Service} from "@nodeboot/core";
import {ChatClient, ChatMemory, MessageChatMemoryAdvisor} from "@nodeboot/ai-core";

@Service()
export class AssistantService {
    constructor(
        @Inject() private readonly chatClient: ChatClient,
        // Registered under the "ChatMemory" name (not the class), so it must be injected by name too
        @Inject("ChatMemory") private readonly chatMemory: ChatMemory,
    ) {}

    async chat(userInput: string, currentUser: {id: string}, session: {id: string}) {
        // Use a conversation id that is unique per user (and per conversation, if a user can
        // hold more than one) — derive it from the current user/session rather than reusing a
        // fixed value across users.
        const conversationId = `${currentUser.id}:${session.id}`;

        return (
            this.chatClient
                .prompt()
                .user(userInput)
                .advisors(new MessageChatMemoryAdvisor({chatMemory: this.chatMemory}))
                .conversationId(conversationId)
                // equivalent: .param(ChatMemory.CONVERSATION_ID, conversationId)
                .call()
                .content()
        );
    }
}
```

If every `ChatClient` call in your app should use chat memory, register the advisor once as a
default instead of passing it on every call — override the `ChatClient` bean in a `@Configuration`
class using `.mutate()` off the auto-configured instance:

```typescript
import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient, ChatMemory, MessageChatMemoryAdvisor} from "@nodeboot/ai-core";

@Configuration()
export class ChatClientConfig {
    @Bean()
    chatClient({iocContainer}: BeansContext) {
        const chatMemory = iocContainer.get<ChatMemory>("ChatMemory");
        const defaultChatClient = iocContainer.get(ChatClient);

        iocContainer.set(
            ChatClient,
            defaultChatClient.mutate().defaultAdvisors(new MessageChatMemoryAdvisor({chatMemory})).build(),
        );
    }
}
```

### Using memory directly with a `ChatModel`

```typescript
import {Inject, Service} from "@nodeboot/core";
import {ChatMemory, Prompt, UserMessage} from "@nodeboot/ai-core";
// Concrete ChatModel implementation registered by your model package, e.g. @nodeboot/ai-openai
import {OpenAiChatModel} from "@nodeboot/ai-openai";

@Service()
export class AssistantService {
    constructor(
        // Registered under the "ChatMemory" name (not the class), so it must be injected by name too
        @Inject("ChatMemory") private readonly chatMemory: ChatMemory,
        // Registered by concrete class, so a plain typed constructor param resolves it via reflection
        private readonly chatModel: OpenAiChatModel,
    ) {}

    async chat(conversationId: string, userInput: string) {
        await this.chatMemory.add(conversationId, new UserMessage(userInput));
        const response = await this.chatModel.call(new Prompt(await this.chatMemory.get(conversationId)));
        await this.chatMemory.add(conversationId, response.result.message);
        return response.result.message;
    }
}
```

### Custom `ChatMemoryRepository`

Implement `ChatMemoryRepository` to back `MessageWindowChatMemory` with your own storage (SQL,
Redis, MongoDB, etc.) — the interface only needs to persist and retrieve message snapshots per
conversation id; eviction policy stays in `MessageWindowChatMemory`:

```typescript
class MyChatMemoryRepository implements ChatMemoryRepository {
    findConversationIds() {
        /* ... */
    }
    findByConversationId(conversationId: string) {
        /* ... */
    }
    saveAll(conversationId: string, messages: Message[]) {
        /* ... */
    }
    deleteByConversationId(conversationId: string) {
        /* ... */
    }
}
```

Don't want to write your own repository? [`@nodeboot/ai-persistence`](https://github.com/nodejs-boot/node-boot/blob/main/ai/persistence/README.md)
provides ready-made `SqlChatMemoryRepository` and `MongoChatMemoryRepository` implementations
(built on `@nodeboot/starter-persistence`), pluggable through a single `@EnableChatMemory({type: "sql" | "mongo"})`
class decorator.
