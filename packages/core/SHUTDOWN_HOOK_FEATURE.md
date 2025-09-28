    }

        expect(cleanupSpy).toHaveBeenCalled();
    });

});

````

## API Reference

### ShutdownHookContext

The main context class that manages all shutdown hooks.

#### Static Methods

- `get(): ShutdownHookContext` - Get the singleton instance
- `reset(): void` - Reset the context (useful for testing)

#### Instance Methods

- `addShutdownHook(metadata: ShutdownHookMetadata): void` - Register a shutdown hook
- `removeShutdownHook(target: any, methodName: string | symbol): void` - Remove a shutdown hook
- `getShutdownHooksCount(): number` - Get count of registered hooks
- `executeShutdownHooks(reason?: string): Promise<void>` - Execute all hooks
- `clear(): void` - Clear all hooks

### @ShutdownHook Decorator

Decorator to mark methods as shutdown hooks.

#### Signature

```typescript
function ShutdownHook(options?: ShutdownHookOptions): MethodDecorator
````

#### Options

```typescript
interface ShutdownHookOptions {
    priority?: number; // Default: 0
    timeout?: number; // Default: undefined (no timeout)
}
```

### ShutdownHookMetadata

Interface describing shutdown hook metadata.

```typescript
interface ShutdownHookMetadata {
    target: any;
    methodName: string | symbol;
    priority: number;
    timeout?: number;
}
```

## Troubleshooting

### Common Issues

1. **Hooks not executing**: Ensure your class is decorated with `@Service()` or registered in the DI container
2. **Timeout errors**: Increase timeout value or optimize cleanup operations
3. **Wrong execution order**: Check priority values (higher numbers execute first)
4. **Hooks executing multiple times**: This is prevented automatically, but check for duplicate registrations

### Debug Logging

Enable debug logging to see hook execution:

```typescript
// The framework automatically logs hook execution
// Look for messages like:
// 🛑 NodeBoot shutdown initiated (SIGINT). Executing 3 cleanup hooks...
// 🧹 Executing shutdown hook: DatabaseService::closeConnection()
// ✅ Shutdown hook completed: DatabaseService::closeConnection()
```

## Migration Guide

If you were manually handling cleanup before:

### Before (Manual)

```typescript
process.on("SIGINT", async () => {
    await database.close();
    await cache.flush();
    process.exit(0);
});
```

### After (Automatic)

```typescript
@Service()
class DatabaseService {
    @ShutdownHook({priority: 100})
    async close() {
        await this.connection.close();
    }
}

@Service()
class CacheService {
    @ShutdownHook({priority: 50})
    async flush() {
        await this.cache.flush();
    }
}
```

The `@ShutdownHook` decorator provides a cleaner, more maintainable approach to resource cleanup with better error handling and priority management.
