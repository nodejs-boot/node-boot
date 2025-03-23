# Typescript example #2

# 📆 `@nodeboot/starter-scheduler` – Node-Boot Scheduling Starter

## Overview

The `@nodeboot/starter-scheduler` package provides a simple yet powerful mechanism to schedule jobs within a **Node-Boot** application, similar to how **Spring Boot Scheduler** works.

It leverages [`node-cron`](https://www.npmjs.com/package/node-cron) under the hood to execute scheduled tasks at specified intervals based on **cron expressions**.

The second typescript example for the Monorepo example
With minimal configuration, developers can **automatically trigger functions** within beans using the `@Scheduler` decorator.

## License

---

MIT License

## ✨ Features

Copyright (c) 2023 NodeBoot
✅ **Annotation-based scheduling** – Just add `@Scheduler(cronExpression)` to any bean method.
✅ **Cron-based execution** – Supports flexible scheduling using cron expressions.  
✅ **Lifecycle-aware** – Scheduling starts when the application initializes.  
✅ **Minimal setup** – Requires only `@EnableScheduling` to activate.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

---

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## 🚀 Installation

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
Ensure you have **Node-Boot** installed in your project. Then, install the scheduler starter package:

```sh
pnpm add @nodeboot/starter-scheduler
```

---

## 🔥 Usage

### 1️⃣ Enable Scheduling in Your Application

To activate the scheduling system, add `@EnableScheduling()` to your application class:

```typescript
import {EnableScheduling} from "@nodeboot/starter-scheduler";
import {NodeBootApplication, NodeBoot, ExpressServer} from "@nodeboot/core";

@EnableScheduling()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

---

### 2️⃣ Schedule Jobs Using `@Scheduler`

To schedule a method to run at a specific interval, **add the `@Scheduler` decorator** to a method inside a bean (`@Service`, `@Component`, etc.).

The method will automatically run based on the **cron expression** provided.

#### Example: Run a Task Every Minute

```typescript
import {Scheduler} from "@nodeboot/starter-scheduler";
import {Service} from "@nodeboot/core";

@Service()
export class TaskService {
    @Scheduler("* * * * *") // Runs every minute
    public logMessage() {
        console.log(`Task executed at: ${new Date().toISOString()}`);
    }
}
```

**✅ This will log a message every minute!** 🕒

---

### 3️⃣ Understanding Cron Expressions

The `@Scheduler` decorator follows standard **cron syntax**:

```plaintext
*    *    *    *    *
│    │    │    │    │
│    │    │    │    └── Day of the Week (0-6, Sunday = 0)
│    │    │    └──── Month (1-12)
│    │    └─────── Day of the Month (1-31)
│    └────────── Hour (0-23)
└──────────── Minute (0-59)
```

| Expression      | Meaning                           |
| --------------- | --------------------------------- |
| `"* * * * *"`   | Runs **every minute**             |
| `"0 * * * *"`   | Runs **every hour** (at 0 min)    |
| `"0 0 * * *"`   | Runs **daily at midnight**        |
| `"0 0 * * 1"`   | Runs **every Monday at midnight** |
| `"*/5 * * * *"` | Runs **every 5 minutes**          |

For more advanced cron expressions, refer to [`node-cron` documentation](https://www.npmjs.com/package/node-cron).

---

## 🛠️ How It Works Internally

### 🔹 `@Scheduler(cronExpression: string)`

This decorator:

-   Registers the method as a **scheduled job**.
-   Uses the **Adapter Pattern** to integrate with the Node-Boot lifecycle.
-   Triggers execution based on the cron expression.

### 🔹 `@EnableScheduling()`

-   Enables **automatic scheduling** in the application.
-   Registers the **Scheduler Adapter** into the **Node-Boot lifecycle**.
-   Ensures all `@Scheduler` jobs are scheduled at startup.

---

## 🎯 Example: Sending Notifications Every Hour

Imagine you need to send notifications to users every hour. You can achieve this with:

```typescript
import {Scheduler} from "@nodeboot/starter-scheduler";
import {Service} from "@nodeboot/core";

@Service()
export class NotificationService {
    @Scheduler("0 * * * *") // Runs at the start of every hour
    public sendNotifications() {
        console.log(`📢 Sending notifications to users at ${new Date().toISOString()}`);
    }
}
```

🔔 **This will trigger notifications every hour, automatically!**

---

## ⚠️ Common Issues & Debugging

### ❌ `@Scheduler` Not Running?

✔️ Ensure **@EnableScheduling()** is added to your application class.  
✔️ Verify the **cron expression** is correct.  
✔️ Check the logs to see if the scheduler is registered.

---

## 📚 Additional Resources

-   [Node-Cron Documentation](https://www.npmjs.com/package/node-cron)
-   [Understanding Cron Expressions](https://crontab.guru/)
-   [Node-Boot Framework](https://github.com/nodeboot)

---

## 🎉 Conclusion

The `@nodeboot/starter-scheduler` package makes scheduling **effortless and declarative** within **Node-Boot applications**.

By simply adding `@Scheduler(cronExpression)`, you can automate periodic tasks, **without manually managing timers**.

Happy scheduling! 🚀🎯
