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

TO BE CONTINUED...
