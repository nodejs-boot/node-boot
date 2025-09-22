# 🔍 `@nodeboot/starter-actuator` – Node-Boot Actuator Starter

[![npm version](https://img.shields.io/npm/v/@nodeboot/starter-actuator.svg)](https://www.npmjs.com/package/@nodeboot/starter-actuator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Node-Boot Actuator Starter** provides production-ready monitoring, health checks, and application insights for Node-Boot applications, following Spring Boot Actuator patterns for the Node.js ecosystem.

## Overview

The Node-Boot Actuator Starter brings comprehensive application monitoring and observability to your Node.js applications. It automatically exposes operational endpoints for health checks, metrics collection, application information, and more. This starter is the Node.js equivalent of Spring Boot Actuator, providing the same level of production-ready monitoring capabilities.

### Key Features

✅ **Auto-Configuration** – Zero-configuration setup with sensible defaults  
✅ **Health Checks** – Built-in health endpoints with custom health indicators  
✅ **Prometheus Metrics** – Automatic metrics collection and exposure  
✅ **Application Info** – Git information, build details, and environment data  
✅ **Multi-Framework Support** – Works with Express, Fastify, Koa, and native HTTP  
✅ **Production-Ready** – Battle-tested monitoring patterns from Spring Boot

---

## 📦 Installation

### Prerequisites

-   Node.js 18+
-   Node-Boot 2.0+
-   One of the supported servers: Express, Fastify, Koa, or native HTTP

### Install the Starter

```bash
# pnpm (recommended)
pnpm add @nodeboot/starter-actuator

# npm
npm install @nodeboot/starter-actuator

# yarn
yarn add @nodeboot/starter-actuator
```

### Auto-Configuration

This starter provides auto-configuration when added to your Node-Boot application. No additional setup required for basic usage.

---

## ⚡ Quick Start

### 1️⃣ Enable Actuator in Your Application

```typescript
import {NodeBootApplication, NodeBoot, ExpressServer} from "@nodeboot/core";
import {EnableActuator} from "@nodeboot/starter-actuator";

@EnableActuator()
@NodeBootApplication()
export class Application {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

### 2️⃣ Basic Usage

Once enabled, the actuator automatically exposes monitoring endpoints:

```typescript
import {Service} from "@nodeboot/core";

@Service()
export class MyService {
    async doSomething() {
        // Your business logic - metrics are automatically collected
        return "Hello World";
    }
}
```

### 3️⃣ Verify Setup

```bash
# Start your application
pnpm start

# Access the actuator endpoints:
# Health check
curl http://localhost:3000/actuator/health

# Application info
curl http://localhost:3000/actuator/info

# Prometheus metrics
curl http://localhost:3000/actuator/metrics

# Look for these log messages indicating successful setup:
# ✅ Actuator endpoints enabled
# ✅ Health checks registered
# ✅ Metrics collection started
```

---

## ⚙️ Configuration

### Auto-Configuration Properties

The starter automatically configures actuator with these default properties:

```yaml
# Default configuration (auto-applied)
actuator:
    enabled: true
    endpoints:
        enabled: true
        basePath: "/actuator"
    health:
        enabled: true
    info:
        enabled: true
    metrics:
        enabled: true
```

### Custom Configuration

Add configuration to your `app-config.yaml` file:

```yaml
# app-config.yaml
app:
    name: "my-application"
    environment: "development"

actuator:
    enabled: true
    endpoints:
        enabled: true
        basePath: "/management" # Custom base path
    health:
        enabled: true
        showDetails: "always" # Show detailed health information
    info:
        enabled: true
        git:
            enabled: true # Include git information
    metrics:
        enabled: true
        prometheus:
            enabled: true
```

### Local Development Configuration

For local development, create an `app-config.local.yaml` file (git-ignored):

```yaml
# app-config.local.yaml (git-ignored)
app:
    environment: "local"

actuator:
    health:
        showDetails: "always" # Show full health details in local
    info:
        sensitive: false # Show sensitive info in local
```

### Environment Variables

Environment variables can override YAML configuration:

```bash
# Override app configuration
APP_NAME=my-application
APP_ENVIRONMENT=production

# Override actuator configuration
ACTUATOR_ENABLED=true
ACTUATOR_ENDPOINTS_BASE_PATH=/management
ACTUATOR_HEALTH_SHOW_DETAILS=when-authorized
```

### Configuration Schema

```typescript
// Configuration interfaces based on actual Node-Boot patterns
export interface ActuatorConfig {
    enabled: boolean;
    endpoints: {
        enabled: boolean;
        basePath: string;
    };
    health: {
        enabled: boolean;
        showDetails: "never" | "when-authorized" | "always";
    };
    info: {
        enabled: boolean;
        git?: {
            enabled: boolean;
        };
    };
    metrics: {
        enabled: boolean;
        prometheus?: {
            enabled: boolean;
        };
    };
}
```

---

## 📖 API Reference

### Decorators

#### `@EnableActuator()`

Enables actuator auto-configuration in your Node-Boot application.

```typescript
@EnableActuator()
@NodeBootApplication()
export class Application {}
```

### Endpoints

The actuator exposes several production-ready endpoints:

#### `/actuator/health`

Provides application health information.

**Response Example:**

```json
{
    "status": "UP",
    "components": {
        "database": {
            "status": "UP",
            "details": {
                "type": "better-sqlite3"
            }
        },
        "diskSpace": {
            "status": "UP",
            "details": {
                "total": 500000000000,
                "free": 400000000000
            }
        }
    }
}
```

#### `/actuator/info`

Provides application information including git details and build info.

**Response Example:**

```json
{
    "app": {
        "name": "my-application",
        "version": "1.0.0",
        "environment": "production"
    },
    "git": {
        "branch": "main",
        "commit": {
            "id": "abc123...",
            "time": "2024-01-15T10:30:00Z"
        }
    }
}
```

#### `/actuator/metrics`

Provides Prometheus-compatible metrics.

**Response:** Prometheus metrics format with application-specific metrics including:

-   HTTP request counts and duration
-   System metrics (memory, CPU)
-   Custom business metrics

### Services

#### `HealthService`

Core service for managing health checks.

**Methods:**

-   `addHealthIndicator(name: string, indicator: HealthIndicator)` - Add custom health check
-   `getHealth()` - Get overall application health

#### `MetricsService`

Service for custom metrics collection.

**Methods:**

-   `incrementCounter(name: string, labels?: object)` - Increment a counter metric
-   `observeHistogram(name: string, value: number, labels?: object)` - Record histogram value

---

## 🎨 Examples

### Basic Example

```typescript
// Simple actuator setup
@EnableActuator()
@NodeBootApplication()
export class BasicApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

### Advanced Example

```typescript
// Custom health checks and metrics
@Service()
export class DatabaseHealthIndicator {
    constructor(private logger: Logger) {}

    async check(): Promise<HealthStatus> {
        try {
            // Check database connectivity
            await this.pingDatabase();
            return {
                status: "UP",
                details: {
                    type: "database",
                    connectionPool: "healthy",
                },
            };
        } catch (error) {
            this.logger.error("Database health check failed", error);
            return {
                status: "DOWN",
                details: {
                    type: "database",
                    error: error.message,
                },
            };
        }
    }

    private async pingDatabase(): Promise<void> {
        // Database ping logic
    }
}
```

### Integration Example

```typescript
// Real-world integration with other Node-Boot features
import {NodeBootApplication, NodeBoot, ExpressServer} from "@nodeboot/core";
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {EnableOpenApi} from "@nodeboot/starter-openapi";
import {EnableActuator} from "@nodeboot/starter-actuator";

@EnableActuator()
@EnableScheduling()
@EnableOpenApi()
@NodeBootApplication()
export class ProductionApplication {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}

@Service()
export class MonitoredService {
    constructor(private logger: Logger, private metricsService: MetricsService) {}

    async processOrder(orderId: string) {
        const startTime = Date.now();
        try {
            // Business logic
            this.logger.info(`Processing order ${orderId}`);

            // Custom metrics
            this.metricsService.incrementCounter("orders_processed_total", {
                status: "success",
            });

            return {orderId, status: "processed"};
        } catch (error) {
            this.metricsService.incrementCounter("orders_processed_total", {
                status: "error",
            });
            throw error;
        } finally {
            const duration = Date.now() - startTime;
            this.metricsService.observeHistogram("order_processing_duration_ms", duration);
        }
    }

    @Scheduler("0 */5 * * * *") // Every 5 minutes
    async healthCheck() {
        // Periodic health verification
        this.logger.info("Performing scheduled health check");
    }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue: Actuator endpoints not accessible

**Symptoms:** 404 errors when accessing `/actuator/*` endpoints
**Cause:** Actuator not properly enabled or misconfigured base path
**Solution:**

```typescript
// Ensure @EnableActuator() is applied to your application class
@EnableActuator()
@NodeBootApplication()
export class Application {}
```

#### Issue: Health checks showing DOWN status

**Symptoms:** `/actuator/health` returns 503 status
**Cause:** One or more health indicators are failing
**Solution:**

```yaml
# Enable detailed health information to diagnose
actuator:
    health:
        showDetails: "always"
```

#### Issue: Metrics not collecting

**Symptoms:** Empty or missing metrics in `/actuator/metrics`
**Cause:** Prometheus registration issues or missing dependencies
**Solution:**

```bash
# Ensure prom-client dependency is properly installed
pnpm add prom-client
```

### Debugging

#### Enable Debug Logging

```yaml
# app-config.yaml - Enable debug logging for troubleshooting
app:
    name: "my-application"
    environment: "development"

# Add debug logging configuration
logging:
    level:
        "@nodeboot/starter-actuator": DEBUG
        root: INFO
```

#### Health Verification

```typescript
// Verify actuator is working correctly
@Service()
export class ActuatorHealthService {
    constructor(private logger: Logger) {}

    async checkActuatorHealth() {
        try {
            // Test health endpoint
            const response = await fetch("http://localhost:3000/actuator/health");
            const health = await response.json();

            this.logger.info("Actuator health check passed", {health});
            return {status: "healthy", actuator: "working"};
        } catch (error) {
            this.logger.error("Actuator health check failed", error);
            throw error;
        }
    }
}
```

### FAQ

**Q: How does this compare to Spring Boot Actuator?**
A: Node-Boot Actuator provides the same core functionality as Spring Boot Actuator, including health checks, metrics, and info endpoints. The main difference is the underlying technology stack (Node.js vs Java) and some Node.js-specific metrics.

**Q: Can I use this with Kubernetes?**
A: Yes! The health and metrics endpoints are designed to work with Kubernetes liveness/readiness probes and Prometheus monitoring. Configure your Kubernetes deployments to use `/actuator/health` for health checks and `/actuator/metrics` for metrics scraping.

**Q: How do I add custom health indicators?**
A: Implement the `HealthIndicator` interface and register it with the `HealthService`. The actuator will automatically include your custom health checks in the overall health status.

**Q: What metrics are collected by default?**
A: The actuator automatically collects HTTP request metrics (count, duration), system metrics (memory, CPU), and Node.js process metrics. You can add custom business metrics using the `MetricsService`.

**Q: How do I secure the actuator endpoints?**
A: Use your web framework's security mechanisms to protect the `/actuator/*` endpoints. You can also configure different security levels for different endpoints (e.g., public health, secured metrics).

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related

-   **Node-Boot Core**: [@nodeboot/core](https://www.npmjs.com/package/@nodeboot/core)
-   **Scheduler Starter**: [@nodeboot/starter-scheduler](https://www.npmjs.com/package/@nodeboot/starter-scheduler)
-   **OpenAPI Starter**: [@nodeboot/starter-openapi](https://www.npmjs.com/package/@nodeboot/starter-openapi)
-   **Persistence Starter**: [@nodeboot/starter-persistence](https://www.npmjs.com/package/@nodeboot/starter-persistence)
-   **Spring Boot Reference**: [Spring Boot Actuator Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)

## 📞 Support

-   **GitHub Issues**: [Report bugs or request features](https://github.com/nodejs-boot/node-boot/issues)
-   **Discussions**: [Community discussions](https://github.com/nodejs-boot/node-boot/discussions)
-   **Documentation**: [Full documentation](https://nodejs-boot.github.io/node-boot/)
