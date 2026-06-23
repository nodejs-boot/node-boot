# Quick Start Guide

This guide will help you get the Native HTTP Server with Supabase sample running quickly.

## 1. Prerequisites

-   Node.js 18 or higher
-   pnpm (or npm)
-   A Supabase project account

## 2. Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Once created, go to Project Settings > API
4. Copy your Project URL and Service Role Key

## 3. Configuration

Create or update `app-config.local.yaml`:

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

## 4. Setup Supabase Database

Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to create the required database schema.

## 5. Install Dependencies

```bash
pnpm install
```

## 6. Run the Application

### Development Mode (with hot reload)

```bash
pnpm run dev
```

Server will run at `http://localhost:3000`

### Production Build

```bash
pnpm run start:prod
```

## 7. Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

### Get Home with Available Endpoints

```bash
curl http://localhost:3000/
```

### Create a User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "username": "testuser"
  }'
```

### Get All Items

```bash
curl http://localhost:3000/items
```

### Create an Item

```bash
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Item",
    "description": "A sample item",
    "category": "samples"
  }'
```

### Authenticate and Get User Profile

To access authenticated endpoints, you need a valid JWT token. This token is obtained when you create or login to a Supabase user:

```bash
# Get current user profile (replace {jwt_token} with your actual token)
curl http://localhost:3000/users/profile/me \
  -H "Authorization: Bearer {jwt_token}"
```

### Get All Users (Authenticated)

```bash
curl http://localhost:3000/users \
  -H "Authorization: Bearer {jwt_token}"
```

### View Swagger Documentation

Open your browser to: `http://localhost:3000/swagger`

## 8. Docker Deployment

Build and run with Docker:

```bash
docker build -t native-http-supabase-sample .
docker run -p 3000:3000 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  native-http-supabase-sample
```

## Available Endpoints

-   `GET /` - Welcome message with endpoint list
-   `GET /health` - Health check status
-   `GET /ready` - Readiness probe
-   `GET /items` - List all items
-   `POST /items` - Create a new item
-   `GET /items/:id` - Get item by ID
-   `PUT /items/:id` - Update an item
-   `DELETE /items/:id` - Delete an item
-   `POST /users` - Create a new user
-   `GET /users` - List all users (requires authentication)
-   `GET /users/:id` - Get user by ID (requires authentication)
-   `GET /users/profile/me` - Get current user profile (requires authentication)
-   `PUT /users/:id/roles` - Update user roles (requires ADMIN role)
-   `DELETE /users/:id` - Delete a user (requires ADMIN role)
-   `GET /swagger` - API documentation
-   `GET /actuator/health` - Actuator health check

## Troubleshooting

### Connection Error

If you get a connection error, verify:

1. Supabase project is active
2. URL and credentials are correct
3. Network connectivity to supabase.co
4. Service Role Key has appropriate permissions

### Database Error

Make sure you've created the `items` table in Supabase. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

### Port Already in Use

Change the port in `app-config.local.yaml`:

```yaml
server:
    port: 3001
```

## Next Steps

1. Explore the application structure in the `src/` folder
2. Read the service layer code to understand Supabase integration
3. Check the controllers for HTTP endpoint implementations
4. Review [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database setup details
5. Study the authentication and authorization implementation in `src/auth/`

## Authentication & Authorization Guide

### How Authentication Works

1. Create a user account using the `/users` POST endpoint
2. Supabase securely stores the credentials
3. User profile is automatically created with the USER role
4. User authenticates by sending their JWT token in the Authorization header
5. The LoggedInUserResolver validates the token and extracts user information

### How Authorization Works

1. Some endpoints require authentication (marked with `@Authorized()`)
2. Some endpoints require specific roles (marked with `@Authorized(["ADMIN"])`)
3. Authorization is checked before the endpoint handler is called
4. User roles are stored in the profiles table

### Example: Create User and Authenticate

```bash
# 1. Create a user
RESPONSE=$(curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "username": "newuser"
  }')

# 2. Get the user ID from the response
USER_ID=$(echo $RESPONSE | jq -r '.data.id')

# 3. Note: To get a JWT token for authentication, you'll need to implement
#    a login endpoint or use Supabase Auth directly. See SUPABASE_SETUP.md
#    for more details on JWT token handling.

# 4. Once you have a JWT token, use it for authenticated requests:
curl http://localhost:3000/users/profile/me \
  -H "Authorization: Bearer {your_jwt_token}"
```

### User Roles

The system supports these roles:

-   `USER` - Standard user (default)
-   `ADMIN` - Administrator (full access)
-   `MODERATOR` - Moderator (content moderation)

To change a user's role (requires ADMIN role):

```bash
curl -X PUT http://localhost:3000/users/{user_id}/roles \
  -H "Authorization: Bearer {admin_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"roles": ["USER", "ADMIN"]}'
```

## Resources

-   [Node-Boot Documentation](https://nodejs-boot.github.io/)
-   [Supabase Documentation](https://supabase.com/docs)
-   [TypeScript Documentation](https://www.typescriptlang.org/docs/)
