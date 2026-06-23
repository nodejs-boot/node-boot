# Supabase Database Setup

This document provides guidance on setting up the Supabase database schema for this sample application with authentication and authorization support.

## Prerequisites

-   A Supabase project created at [supabase.com](https://supabase.com)
-   Your Supabase project credentials (URL and service role key)
-   Access to the Supabase SQL editor

## Create Database Tables

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Create items table
CREATE TABLE IF NOT EXISTS items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table for user management and authentication
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    roles TEXT[] DEFAULT ARRAY['USER']::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to call the function
CREATE TRIGGER update_items_updated_at BEFORE UPDATE
    ON items FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE
    ON profiles FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Enable Row Level Security (RLS)

Enable RLS for both tables:

```sql
-- Enable Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for items table
-- Allow authenticated users to read all items
CREATE POLICY "Allow authenticated users to read items"
    ON items
    FOR SELECT
    USING (auth.role() = 'authenticated'::text);

-- Allow authenticated users to create items
CREATE POLICY "Allow authenticated users to create items"
    ON items
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated'::text);

-- Allow authenticated users to update items
CREATE POLICY "Allow authenticated users to update items"
    ON items
    FOR UPDATE
    USING (auth.role() = 'authenticated'::text);

-- Allow authenticated users to delete items
CREATE POLICY "Allow authenticated users to delete items"
    ON items
    FOR DELETE
    USING (auth.role() = 'authenticated'::text);

-- RLS Policies for profiles table
-- Allow anyone to view profiles (public read access)
CREATE POLICY "Allow viewing profiles"
    ON profiles
    FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to delete their own profile (with cascade on auth.users)
CREATE POLICY "Users can delete own profile"
    ON profiles
    FOR DELETE
    USING (auth.uid() = id);
```

## Set Up User Auto-provisioning

Create a trigger that automatically creates a profile when a user signs up:

```sql
-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, roles)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        ARRAY['USER']::TEXT[]
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = schema_name, public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

## Configuration

Update your `app-config.local.yaml` with your Supabase credentials:

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

Or set environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## User Roles

The system supports the following user roles stored in the `profiles.roles` array:

-   `USER` - Standard user role (default for all new users)
-   `ADMIN` - Administrator role (can manage users and items)
-   `MODERATOR` - Moderator role (can moderate content)

## Authentication & Authorization

### How Authentication Works

1. Users create an account using the `/users` POST endpoint with email, password, and username
2. Supabase Auth creates the user and stores credentials securely
3. The auto-provisioning trigger creates a profile entry with the `USER` role
4. Users authenticate by sending their JWT token in the `Authorization: Bearer {token}` header
5. The `LoggedInUserResolver` validates the token and extracts user information

### How Authorization Works

1. The `DefaultAuthorizationResolver` checks user roles for protected endpoints
2. Endpoints decorated with `@Authorized()` allow any authenticated user
3. Endpoints decorated with `@Authorized(["ADMIN"])` only allow users with the ADMIN role
4. Role validation happens before the endpoint handler is called

### User Endpoints

-   `POST /users` - Create a new user (public)
-   `GET /users` - Get all users (requires authentication)
-   `GET /users/:id` - Get user by ID (requires authentication)
-   `GET /users/profile/me` - Get current user profile (requires authentication)
-   `PUT /users/:id/roles` - Update user roles (requires ADMIN role)
-   `DELETE /users/:id` - Delete user (requires ADMIN role)

## Testing the Setup

Once configured, you can test the endpoints:

```bash
# 1. Create a new user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "username": "testuser"
  }'

# 2. Health check
curl http://localhost:3000/health

# 3. Fetch all items (public access)
curl http://localhost:3000/items

# 4. Create an item (no auth required in this example)
curl -X POST http://localhost:3000/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Sample Item","description":"A test item","category":"test"}'

# 5. Get a specific item
curl http://localhost:3000/items/{id}

# 6. Update an item
curl -X PUT http://localhost:3000/items/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Item"}'

# 7. Delete an item
curl -X DELETE http://localhost:3000/items/{id}

# 8. Get all users (requires authentication)
curl http://localhost:3000/users \
  -H "Authorization: Bearer {jwt_token}"

# 9. Get current user profile
curl http://localhost:3000/users/profile/me \
  -H "Authorization: Bearer {jwt_token}"
```

## Database Schema

### Items Table

| Column      | Type         | Description                 |
| ----------- | ------------ | --------------------------- |
| id          | UUID         | Primary key, auto-generated |
| name        | VARCHAR(255) | Item name (required)        |
| description | TEXT         | Item description (optional) |
| category    | VARCHAR(100) | Item category (optional)    |
| created_at  | TIMESTAMP    | Creation timestamp          |
| updated_at  | TIMESTAMP    | Last update timestamp       |

### Profiles Table

| Column     | Type      | Description                             |
| ---------- | --------- | --------------------------------------- |
| id         | UUID      | Foreign key to auth.users, primary key  |
| email      | TEXT      | User email (unique, indexed)            |
| username   | TEXT      | Username (unique, indexed)              |
| roles      | TEXT[]    | Array of user roles (default: ['USER']) |
| created_at | TIMESTAMP | Creation timestamp                      |
| updated_at | TIMESTAMP | Last update timestamp                   |

## Troubleshooting

### Connection Error

If you get a connection error, verify:

1. Supabase project is active
2. URL and credentials are correct
3. Network connectivity to supabase.co
4. Service Role Key has appropriate permissions

### Authentication Error

If authentication isn't working:

1. Verify the user exists in Supabase Auth
2. Check that the JWT token is being passed correctly in the Authorization header
3. Ensure JWT tokens are valid (check expiration)
4. Verify user profile exists in the profiles table

### Permission Denied Error

If you get "permission denied" errors:

1. Verify RLS policies are configured correctly
2. Check that the user has the required role
3. Ensure you're using the Service Role Key for admin operations
4. Verify the user ID matches the record

## References

-   [Supabase Database](https://supabase.com/docs/guides/database)
-   [Supabase Authentication](https://supabase.com/docs/guides/auth)
-   [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
-   [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
-   [JWT Authentication](https://supabase.com/docs/learn/auth-deep-dive/auth-deep-dive-jwts)
