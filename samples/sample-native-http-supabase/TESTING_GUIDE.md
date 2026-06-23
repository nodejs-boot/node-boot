# Authentication & Authorization Testing Guide

This document provides comprehensive instructions for testing the authentication and authorization features of the Native HTTP Supabase Sample.

## Prerequisites

-   Application running on `http://localhost:3000`
-   `curl` or a REST client like Postman
-   A Supabase project with proper database setup
-   `jq` (optional, for parsing JSON responses)

## Test Scenarios

### Scenario 1: Create a User and Get Profile

This scenario demonstrates how to create a user and retrieve their profile.

```bash
# 1. Create a new user
echo "Creating user..."
USER_RESPONSE=$(curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!",
    "username": "testuser"
  }')

echo "User created:"
echo "$USER_RESPONSE" | jq '.'

# Extract user ID
USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.id')
echo "User ID: $USER_ID"
```

### Scenario 2: Get All Users (Without Authentication)

```bash
# This should return empty array or limited data if RLS is active
echo "Getting all users without authentication..."
curl -s http://localhost:3000/users | jq '.'
```

### Scenario 3: Authentication with JWT Token

Note: To test this, you need a valid JWT token. Here are the ways to obtain one:

#### Option 1: Using Supabase CLI

```bash
# Login to Supabase
supabase link --project-ref=<your-project-ref>

# Get JWT token for your user
supabase auth admin create-user --email testuser@example.com --password 'SecurePassword123!'
```

#### Option 2: Using Supabase API

```bash
# Sign in user to get JWT token
TOKEN_RESPONSE=$(curl -s -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!"
  }')

JWT_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
echo "JWT Token: $JWT_TOKEN"
```

#### Option 3: Using a Testing Script

Create a file `get-token.sh`:

```bash
#!/bin/bash
SUPABASE_URL="https://your-project.supabase.co"
EMAIL="testuser@example.com"
PASSWORD="SecurePassword123!"

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$RESPONSE" | jq -r '.access_token'
```

### Scenario 4: Get Current User Profile (With Authentication)

```bash
# Using the JWT token obtained in Scenario 3
echo "Getting current user profile..."
curl -s http://localhost:3000/users/profile/me \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
```

### Scenario 5: Get All Users (With Authentication)

```bash
echo "Getting all users with authentication..."
curl -s http://localhost:3000/users \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
```

### Scenario 6: Get Specific User (With Authentication)

```bash
echo "Getting specific user..."
curl -s http://localhost:3000/users/$USER_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'
```

### Scenario 7: Update User Roles (Admin Only)

To test admin-only endpoints, first set up an admin user:

```bash
# 1. Create another user with ADMIN role
echo "Creating admin user..."

# First, create a regular user
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "username": "admin"
  }')

ADMIN_ID=$(echo "$ADMIN_RESPONSE" | jq -r '.data.id')
echo "Admin user created with ID: $ADMIN_ID"

# 2. Update to have ADMIN role (this requires a service role key call from the backend)
# For now, this requires manual database update or an admin endpoint
```

### Scenario 8: Delete User (Admin Only)

```bash
echo "Deleting user (requires ADMIN role)..."
curl -s -X DELETE http://localhost:3000/users/$USER_ID \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" | jq '.'
```

### Scenario 9: Test Health Endpoint

```bash
echo "Testing health endpoint..."
curl -s http://localhost:3000/health | jq '.'
```

### Scenario 10: Test Home Endpoint

```bash
echo "Testing home endpoint with available endpoints..."
curl -s http://localhost:3000/ | jq '.'
```

## Error Scenarios

### Scenario 11: Invalid JWT Token

```bash
echo "Testing invalid JWT token..."
curl -s http://localhost:3000/users/profile/me \
  -H "Authorization: Bearer invalid_token" | jq '.'
```

### Scenario 12: Missing Authorization Header

```bash
echo "Testing missing authorization header..."
curl -s http://localhost:3000/users/profile/me | jq '.'
```

### Scenario 13: Create User with Missing Fields

```bash
echo "Testing create user with missing email..."
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePassword123!",
    "username": "testuser"
  }' | jq '.'
```

### Scenario 14: Create User with Duplicate Email

```bash
echo "Testing create user with duplicate email..."
curl -s -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!",
    "username": "anotheruser"
  }' | jq '.'
```

## Automated Test Suite

Create a file `test-suite.sh` for automated testing:

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
SUPABASE_URL="https://your-project.supabase.co"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "========================================="
echo "Starting Authentication Tests"
echo "========================================="

# Test 1: Create User
echo -e "\n${GREEN}Test 1: Create User${NC}"
USER_RESPONSE=$(curl -s -X POST $BASE_URL/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com",
    "password": "TestPass123!",
    "username": "testuser"
  }')

USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.id')
if [ "$USER_ID" != "null" ] && [ ! -z "$USER_ID" ]; then
  echo -e "${GREEN}✓ User created successfully${NC}"
  echo "User ID: $USER_ID"
else
  echo -e "${RED}✗ Failed to create user${NC}"
  echo "$USER_RESPONSE"
  exit 1
fi

# Test 2: Health Check
echo -e "\n${GREEN}Test 2: Health Check${NC}"
HEALTH=$(curl -s $BASE_URL/health)
STATUS=$(echo "$HEALTH" | jq -r '.status')
if [ "$STATUS" == "UP" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "$HEALTH"
fi

# Test 3: Get items
echo -e "\n${GREEN}Test 3: Get Items${NC}"
ITEMS=$(curl -s $BASE_URL/items)
ITEM_COUNT=$(echo "$ITEMS" | jq '.data | length')
echo -e "${GREEN}✓ Retrieved $ITEM_COUNT items${NC}"

# Test 4: Home endpoint
echo -e "\n${GREEN}Test 4: Home Endpoint${NC}"
HOME=$(curl -s $BASE_URL/)
MESSAGE=$(echo "$HOME" | jq -r '.message')
if [ "$MESSAGE" == "Welcome to Native HTTP Supabase Sample" ]; then
  echo -e "${GREEN}✓ Home endpoint working${NC}"
else
  echo -e "${RED}✗ Home endpoint failed${NC}"
fi

echo -e "\n========================================="
echo "Tests completed"
echo "========================================="
```

Run the test suite:

```bash
chmod +x test-suite.sh
./test-suite.sh
```

## Manual Testing with Postman

### Step 1: Create Collection

1. Open Postman
2. Create a new collection "Supabase Sample Tests"
3. Create a new environment with variables:
    - `base_url` = `http://localhost:3000`
    - `jwt_token` = (will be filled during testing)
    - `user_id` = (will be filled during testing)

### Step 2: Create Requests

#### Request 1: Create User

-   Method: POST
-   URL: `{{base_url}}/users`
-   Body (JSON):

```json
{
    "email": "postman.user@example.com",
    "password": "SecurePassword123!",
    "username": "postmanuser"
}
```

#### Request 2: Get Current User Profile

-   Method: GET
-   URL: `{{base_url}}/users/profile/me`
-   Headers:
    -   `Authorization: Bearer {{jwt_token}}`

#### Request 3: Get All Users

-   Method: GET
-   URL: `{{base_url}}/users`
-   Headers:
    -   `Authorization: Bearer {{jwt_token}}`

#### Request 4: Get Health

-   Method: GET
-   URL: `{{base_url}}/health`

## Performance Testing

### Using Apache Bench

```bash
# Test without authentication
ab -n 1000 -c 10 http://localhost:3000/health

# Test with authentication
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/users/profile/me
```

### Using wrk

```bash
# Simple test
wrk -t12 -c400 -d30s http://localhost:3000/health

# With custom script for authentication
cat > wrk-auth.lua << 'EOF'
local token = "your_jwt_token_here"

request = function()
   wrk.headers["Authorization"] = "Bearer " .. token
   return wrk.format(nil, "/users/profile/me")
end
EOF

wrk -t12 -c400 -d30s -s wrk-auth.lua http://localhost:3000
```

## Expected Results

### Successful User Creation

```json
{
    "success": true,
    "data": {
        "id": "uuid-here",
        "email": "user@example.com",
        "username": "testuser",
        "roles": ["USER"],
        "created_at": "2024-01-01T00:00:00Z"
    }
}
```

### Successful Authentication

```json
{
    "success": true,
    "data": {
        "id": "uuid-here",
        "email": "user@example.com",
        "username": "testuser",
        "roles": ["USER"],
        "email_confirmed_at": "2024-01-01T00:00:00Z"
    }
}
```

### Authorization Failure

```json
{
    "statusCode": 403,
    "message": "Forbidden"
}
```

## Troubleshooting

### Issue: JWT token not working

**Solution**:

1. Verify token is not expired
2. Check token format: `Authorization: Bearer {token}`
3. Verify user exists in auth.users table
4. Check Supabase logs for validation errors

### Issue: Profile endpoint returns 404

**Solution**:

1. Verify profiles table exists
2. Check that auto-provisioning trigger is active
3. Ensure user was created through `/users` endpoint

### Issue: Role-based authorization not working

**Solution**:

1. Verify user roles in profiles table
2. Check @Authorized() decorator syntax
3. Verify role names match exactly
4. Check Supabase RLS policies

## Additional Notes

-   All timestamps are in ISO 8601 format with UTC timezone
-   User IDs are UUIDs generated by Supabase
-   Passwords are hashed by Supabase Auth
-   JWT tokens expire (check Supabase settings for TTL)
-   All requests return Content-Type: application/json
