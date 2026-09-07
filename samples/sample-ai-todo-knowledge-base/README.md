# AI Todo Knowledge Base sample

A Node-Boot sample application demonstrating **generative AI** on top of a regular REST API: a
Todo list that doubles as a natural-language **knowledge base**, powered by Google **Gemini**
(`gemini-3.5-flash-lite`) through [`@nodeboot/ai-core`](https://github.com/nodejs-boot/node-boot/blob/main/ai/core/README.md)
and [`@nodeboot/ai-google-genai`](https://github.com/nodejs-boot/node-boot/blob/main/ai/models/google-genai/README.md).

## What it demonstrates

-   **Plain REST CRUD** (`TodoController`) over a SQLite-backed `Todo` entity — no AI involved,
    business logic lives in `TodoService`.
-   **`@Tool` decorator / function calling** (`TodoToolsService`) — every method is registered in
    the global `ToolRegistry` and made callable by Gemini: `list_todos`, `search_todos`,
    `create_todo`, `complete_todo`, `delete_todo`.
-   **Conversational chat with memory** (`AiKnowledgeBaseService#chat`) — uses `ChatClient` +
    `MessageChatMemoryAdvisor` + `ChatMemory` so a conversation keeps context across calls, and the
    model can act on the user's todos on its own via the tools above.
-   **Structured generative output** (`AiKnowledgeBaseService#summarize` / `#suggestPriorities`) —
    uses `ChatClientResponseSpec#entity()` to parse the model's response straight into typed
    objects/arrays, without any tool calling.
-   **OpenAPI/Swagger UI** for exploring every endpoint.

## Prerequisites

Get a free Google AI Studio API key at <https://aistudio.google.com/apikey>, then export it under
Google AI's default environment variable before starting the app:

```sh
export GOOGLE_API_KEY="your-api-key"
```

(`GEMINI_API_KEY` also works — see `@google/genai`'s own fallback — but `GOOGLE_API_KEY` is used by
`app-config.yaml` here.)

## Running

```sh
pnpm install
pnpm dev
```

The app starts on `http://localhost:3000`. Swagger UI is available at
`http://localhost:3000/swagger`.

## Try it

```sh
# Create a couple of todos
curl -s -X POST http://localhost:3000/api/v1/todos \
  -H 'Content-Type: application/json' \
  -d '{"title": "Buy groceries", "description": "Milk, eggs, bread", "priority": "medium"}'

curl -s -X POST http://localhost:3000/api/v1/todos \
  -H 'Content-Type: application/json' \
  -d '{"title": "Finish quarterly report", "priority": "high"}'

# Chat with the knowledge base — Gemini can call tools to answer and act
curl -s -X POST http://localhost:3000/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"conversationId": "demo-1", "message": "What todos do I still have pending?"}'

curl -s -X POST http://localhost:3000/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"conversationId": "demo-1", "message": "Mark the groceries todo as done"}'

# Structured generative output
curl -s -X POST http://localhost:3000/api/v1/ai/summary
curl -s -X POST http://localhost:3000/api/v1/ai/prioritize
```

## Configuration

See [`app-config.yaml`](./app-config.yaml):

-   `persistence` — SQLite (`better-sqlite3`) storage for todos (`synchronize: true`, demo-only —
    use migrations in production, see [`sample-express`](../sample-express)).
-   `ai.google-genai` — Gemini model config, `apiKey: ${GOOGLE_API_KEY}` and
    `chat.options.model: gemini-3.5-flash-lite`.

## Related sample

Looking for the same Todo domain exposed as a **Model Context Protocol (MCP) server** instead of a
REST/chat API? See [`sample-todo-mcp-server`](../sample-todo-mcp-server).
