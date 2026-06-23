# Native HTTP Server with Supabase Persistence Sample

This sample application demonstrates how to create a Node.js HTTP server using Node-Boot with Supabase as the persistence layer.

## Features

-   **Native HTTP Server**: Uses Node.js built-in HTTP module
-   **Supabase Integration**: PostgreSQL database via Supabase
-   **Dependency Injection**: Full DI support using TypeDI
-   **Type Safety**: Complete TypeScript support
-   **Auto-configuration**: Automatic component scanning and configuration loading
-   **OpenAPI/Swagger**: Built-in API documentation
-   **Validation**: Request/response validation with class-validator
-   **Logging**: Structured logging with Winston
-   **Authentication & Authorization**: JWT-based auth with role-based access control

## Prerequisites

-   Node.js 18+
-   pnpm (or npm)
-   A Supabase project with credentials

## Getting Started

### 1. Setup Supabase Credentials

Create or update `app-config.local.yaml` with your Supabase credentials:

```yaml
integrations:
    supabase:
        url: "https://your-project.supabase.co"
        serviceRoleKey: "your-service-role-key"
```

Or set environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 2. Setup Supabase Database

Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to create the required database schema.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Development

```bash
pnpm run dev
```

The server will start at `http://localhost:3000`

### 5. Production Build

```bash
pnpm run start:prod
```

## Project Structure

```
src/
├── app.ts                 # Main application class
├── server.ts             # Server entry point
├── auth/                 # Authentication & authorization resolvers
├── controllers/          # HTTP controllers
├── services/             # Business logic layer
├── models/               # Data models & DTOs
└── config/               # Configuration classes
```

## API Endpoints

### Users

-   `GET /users` - List all users (authenticated)
-   `GET /users/:id` - Get user by ID (authenticated)
-   `POST /users` - Create a new user
-   `PUT /users/:id` - Update a user (authenticated)
-   `DELETE /users/:id` - Delete a user (authenticated)

### Documentation

-   `GET /swagger` - API documentation
-   `GET /actuator/health` - Health check

## Security Best Practices

-   **Server-Side**: Use `serviceRoleKey` for server-side operations
-   **Authentication**: JWT tokens via Supabase Auth
-   **Authorization**: Role-based access control (RBAC)
-   **RLS Policies**: Implement Row Level Security in Supabase
-   **Secrets**: Store sensitive keys in environment variables

## Available Scripts

-   `pnpm run dev` - Start development server with hot reload
-   `pnpm run start` - Build and start the server
-   `pnpm run start:prod` - Build and start in production mode
-   `pnpm run build` - Build the project
-   `pnpm run clean:build` - Clean and rebuild
-   `pnpm run lint` - Run ESLint
-   `pnpm run format` - Check code formatting
-   `pnpm run test` - Run unit tests

## Configuration

Configuration is loaded from `app-config.yaml` with environment variable overrides. Local overrides can be placed in `app-config.local.yaml`.

## Resources

-   [Node-Boot Documentation](https://nodejs-boot.github.io/)
-   [Supabase Documentation](https://supabase.com/docs)
-   [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## License

MIT License - Copyright (c) 2024 NodeBoot
