# Implementation Guide: Native HTTP Supabase Sample with Authentication & Authorization

## Overview

This document summarizes the implementation of authentication and authorization for the Native HTTP Supabase Sample using Node-Boot and Supabase.

## What Was Implemented

### 1. Enhanced Authentication (LoggedInUserResolver)

**File**: `src/auth/LoggedInUserResolver.ts`

**Features**:

-   Extracts JWT tokens from the `Authorization: Bearer` header
-   Validates tokens using Supabase Auth's `getUser()` method
-   Fetches user profile data from the `profiles` table
-   Returns user information including email, username, and roles
-   Handles errors gracefully with appropriate logging

**How It Works**:

1. Extracts token from request header
2. Calls `supabase.auth.getUser(token)` to validate
3. Fetches additional user profile data from Supabase
4. Returns complete user object with roles

### 2. Enhanced Authorization (DefaultAuthorizationResolver)

**File**: `src/auth/DefaultAuthorizationResolver.ts`

**Features**:

-   Validates JWT tokens before checking authorization
-   Fetches user roles from the `profiles` table
-   Implements role-based access control (RBAC)
-   Supports multiple role requirements
-   Logs all authorization attempts for audit purposes

**How It Works**:

1. Validates JWT token using Supabase Auth
2. Fetches user roles from profiles table
3. Checks if user has required roles
4. Returns true/false for endpoint access

### 3. User Service (UserService)

**File**: `src/services/UserService.ts`

**Features**:

-   User creation with email, password, and username
-   User profile management
-   Role management (update user roles)
-   User lookup by ID or email
-   User deletion (with cascade to profiles table)
-   Complete integration with Supabase Auth and Database

**Methods**:

-   `createUser()` - Create new user with auth and profile
-   `getUserById()` - Fetch user by ID
-   `getUserByEmail()` - Fetch user by email
-   `getAllUsers()` - List all users
-   `updateUserProfile()` - Update user profile data
-   `updateUserRoles()` - Update user role assignments
-   `deleteUser()` - Delete user completely

### 4. User Controller (UserController)

**File**: `src/controllers/UserController.ts`

**Endpoints**:

-   `POST /users` - Create new user (public endpoint)
-   `GET /users` - List all users (@Authorized())
-   `GET /users/:id` - Get user by ID (@Authorized())
-   `GET /users/profile/me` - Get current user profile (@Authorized())
-   `PUT /users/:id/roles` - Update user roles (@Authorized(["ADMIN"]))
-   `DELETE /users/:id` - Delete user (@Authorized(["ADMIN"]))

**Features**:

-   Comprehensive error handling
-   Request validation
-   Role-based access control
-   User context injection with @CurrentUser()

### 5. Database Schema

**Updated Supabase Setup**:

-   `items` table - For managing items
-   `profiles` table - For user profile and role management
-   RLS policies - For data protection
-   Auto-provisioning trigger - Automatically creates profiles on user signup

### 6. Updated Documentation

**Files Updated**:

-   `README.md` - Added comprehensive authentication/authorization guide
-   `QUICKSTART.md` - Added user management examples and authentication flow
-   `SUPABASE_SETUP.md` - Complete database setup with user auto-provisioning
-   `HomeController.ts` - Updated welcome endpoint with user management endpoints

## Architecture

### Authentication Flow

```
Client Request with JWT Token
    ↓
HTTP Server receives request
    ↓
LoggedInUserResolver.check() called
    ↓
Token extracted from Authorization header
    ↓
Supabase Auth validates token
    ↓
User profile fetched from database
    ↓
User object returned and available to handler
```

### Authorization Flow

```
Request arrives at protected endpoint (@Authorized)
    ↓
DefaultAuthorizationResolver.check() called
    ↓
Token validated with Supabase Auth
    ↓
User roles fetched from profiles table
    ↓
Required roles compared with user roles
    ↓
Access granted (true) or denied (false)
```

## Database Tables

### Profiles Table (for user management)

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    roles TEXT[] DEFAULT ARRAY['USER']::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Available User Roles

-   `USER` - Standard user (default)
-   `ADMIN` - Administrator (full access)
-   `MODERATOR` - Moderator (content management)

## Key Features

### 1. Token Validation

-   Uses Supabase Auth's native `getUser()` method
-   Validates JWT tokens on every protected request
-   Handles token expiration and refresh

### 2. Role-Based Access Control

-   Roles stored in PostgreSQL array in profiles table
-   Supports multiple roles per user
-   Flexible role checking logic

### 3. User Auto-Provisioning

-   Automatically creates user profile when user signs up
-   Sets default `USER` role for new users
-   Cascade delete when user is removed from auth

### 4. Error Handling

-   Comprehensive error handling and logging
-   Graceful degradation on auth failures
-   Detailed error messages for debugging

## Usage Examples

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

### Authenticate Request

```bash
curl http://localhost:3000/users/profile/me \
  -H "Authorization: Bearer {jwt_token}"
```

### Update User Roles (ADMIN only)

```bash
curl -X PUT http://localhost:3000/users/{user_id}/roles \
  -H "Authorization: Bearer {admin_jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"roles": ["USER", "ADMIN"]}'
```

## Configuration

### app-config.yaml

```yaml
integrations:
    supabase:
        url: "https://your-project.supabase.co"
        serviceRoleKey: "your-service-role-key"
        options:
            auth:
                autoRefreshToken: true
                persistSession: false
                detectSessionInUrl: false
            db:
                schema: "public"
```

## Security Considerations

1. **JWT Token Storage**: Tokens should be stored securely on the client
2. **HTTPS Only**: Always use HTTPS in production
3. **Role Validation**: Roles are checked on every protected request
4. **RLS Policies**: Database-level security with Supabase RLS
5. **Rate Limiting**: Should be implemented at the infrastructure level
6. **Input Validation**: All user inputs are validated before processing
7. **Error Messages**: Avoid leaking sensitive information in error responses

## Testing the Implementation

1. Start the application: `pnpm run dev`
2. Visit the home page: `http://localhost:3000`
3. Create a user via `/users` endpoint
4. Test protected endpoints with the JWT token
5. Test role-based access with ADMIN endpoints

## Next Steps

1. Implement a login endpoint for JWT token retrieval
2. Add JWT token refresh mechanism
3. Implement password reset functionality
4. Add email verification
5. Add social login providers
6. Implement audit logging
7. Add rate limiting
8. Implement API key authentication

## Related Documentation

-   [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
-   [Node-Boot Framework](https://nodejs-boot.github.io/)
-   [JWT Authentication](https://jwt.io/)
-   [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control)

## Files Modified/Created

### Created Files

-   `src/services/UserService.ts` - User management service
-   `src/controllers/UserController.ts` - User management endpoints

### Modified Files

-   `src/auth/LoggedInUserResolver.ts` - Enhanced with Supabase integration
-   `src/auth/DefaultAuthorizationResolver.ts` - Enhanced with Supabase integration
-   `src/controllers/HomeController.ts` - Updated welcome message
-   `README.md` - Added authentication/authorization guide
-   `QUICKSTART.md` - Added user management examples
-   `SUPABASE_SETUP.md` - Complete database setup guide

## Support & Troubleshooting

### Common Issues

1. **Token Validation Fails**

    - Ensure JWT token is valid and not expired
    - Check token format: `Authorization: Bearer {token}`

2. **User Profile Not Found**

    - Verify profiles table exists and has auto-provisioning trigger
    - Check that user was created through the API

3. **Role-Based Access Denied**
    - Verify user roles in profiles table
    - Check role requirements in @Authorized() decorator

### Debugging

Enable debug logging:

```bash
NODE_ENV=development pnpm run dev
```

Check Supabase logs in the dashboard for detailed error information.
