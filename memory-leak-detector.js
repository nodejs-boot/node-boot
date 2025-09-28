#!/usr/bin/env node

/**
 * Memory Leak Detection Script for Node-Boot
 * This script monitors memory usage and detects potential leaks
 */

const {EventEmitter} = require("events");
const v8 = require("v8");
const fs = require("fs");
const path = require("path");

class MemoryLeakDetector {
    constructor() {
        this.initialMemory = process.memoryUsage();
        this.samples = [];
        this.interval = null;
        this.logFile = path.join(__dirname, "memory-leak-report.log");

        // Initialize log file
        fs.writeFileSync(this.logFile, `Memory Leak Detection Report - ${new Date().toISOString()}\n`);
        fs.appendFileSync(this.logFile, "=".repeat(80) + "\n\n");
    }

    start(intervalMs = 5000) {
        console.log("Starting memory leak detection...");
        this.logMemoryUsage("INITIAL");

        this.interval = setInterval(() => {
            this.collectMemorySample();
        }, intervalMs);

        // Log memory usage every minute
        setInterval(() => {
            this.logMemoryUsage("PERIODIC");
        }, 60000);

        // Detect potential leaks every 30 seconds
        setInterval(() => {
            this.analyzeMemoryTrend();
        }, 30000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.generateReport();
        console.log(`Memory leak detection stopped. Report saved to: ${this.logFile}`);
    }

    collectMemorySample() {
        const memUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();

        const sample = {
            timestamp: Date.now(),
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers,
            heapSizeLimit: heapStats.heap_size_limit,
            totalHeapSize: heapStats.total_heap_size,
            usedHeapSize: heapStats.used_heap_size,
        };

        this.samples.push(sample);

        // Keep only last 100 samples to prevent memory issues
        if (this.samples.length > 100) {
            this.samples.shift();
        }
    }

    logMemoryUsage(type) {
        const memUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();

        const logEntry = `
[${type}] ${new Date().toISOString()}
RSS: ${this.formatBytes(memUsage.rss)}
Heap Used: ${this.formatBytes(memUsage.heapUsed)}
Heap Total: ${this.formatBytes(memUsage.heapTotal)}
External: ${this.formatBytes(memUsage.external)}
Array Buffers: ${this.formatBytes(memUsage.arrayBuffers)}
Heap Size Limit: ${this.formatBytes(heapStats.heap_size_limit)}
Total Heap Size: ${this.formatBytes(heapStats.total_heap_size)}
Used Heap Size: ${this.formatBytes(heapStats.used_heap_size)}
${"=".repeat(50)}
`;

        console.log(logEntry);
        fs.appendFileSync(this.logFile, logEntry);
    }

    analyzeMemoryTrend() {
        if (this.samples.length < 10) return;

        const recent = this.samples.slice(-10);
        const older = this.samples.slice(-20, -10);

        if (older.length === 0) return;

        const recentAvgHeap = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
        const olderAvgHeap = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;

        const heapGrowth = ((recentAvgHeap - olderAvgHeap) / olderAvgHeap) * 100;

        if (heapGrowth > 10) {
            // More than 10% growth
            const warning = `
⚠️  POTENTIAL MEMORY LEAK DETECTED ⚠️
Heap memory growth: ${heapGrowth.toFixed(2)}%
Recent average: ${this.formatBytes(recentAvgHeap)}
Previous average: ${this.formatBytes(olderAvgHeap)}
Time: ${new Date().toISOString()}
${"=".repeat(50)}
`;
            console.warn(warning);
            fs.appendFileSync(this.logFile, warning);
        }
    }

    generateReport() {
        if (this.samples.length === 0) return;

        const first = this.samples[0];
        const last = this.samples[this.samples.length - 1];
        const duration = (last.timestamp - first.timestamp) / 1000; // seconds

        const report = `
MEMORY LEAK DETECTION SUMMARY
${"=".repeat(50)}
Duration: ${duration.toFixed(2)} seconds
Initial Heap Used: ${this.formatBytes(first.heapUsed)}
Final Heap Used: ${this.formatBytes(last.heapUsed)}
Memory Growth: ${this.formatBytes(last.heapUsed - first.heapUsed)}
Growth Rate: ${(((last.heapUsed - first.heapUsed) / first.heapUsed) * 100).toFixed(2)}%

RECOMMENDATIONS:
${this.generateRecommendations()}
`;

        fs.appendFileSync(this.logFile, report);
        console.log(report);
    }

    generateRecommendations() {
        if (this.samples.length < 2) return "Not enough data for recommendations.";

        const first = this.samples[0];
        const last = this.samples[this.samples.length - 1];
        const growthRate = ((last.heapUsed - first.heapUsed) / first.heapUsed) * 100;

        let recommendations = [];

        if (growthRate > 20) {
            recommendations.push("- Significant memory growth detected. Check for unclosed resources.");
            recommendations.push("- Review event listeners for proper cleanup.");
            recommendations.push("- Examine database connections and ensure they're properly closed.");
        }

        if (growthRate > 50) {
            recommendations.push("- Critical memory leak suspected. Immediate investigation required.");
            recommendations.push("- Use heap snapshots to identify growing objects.");
        }

        if (last.external > 100 * 1024 * 1024) {
            // 100MB
            recommendations.push("- High external memory usage. Check Buffer and ArrayBuffer usage.");
        }

        if (recommendations.length === 0) {
            recommendations.push("- Memory usage appears stable. No immediate concerns detected.");
        }

        return recommendations.join("\n");
    }

    formatBytes(bytes) {
        const sizes = ["Bytes", "KB", "MB", "GB"];
        if (bytes === 0) return "0 Bytes";
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
    }
}

// Event Emitter leak detection
function detectEventEmitterLeaks() {
    const originalAddListener = EventEmitter.prototype.addListener;
    const originalOn = EventEmitter.prototype.on;
    const listenerCounts = new Map();

    function trackListener(emitter, event) {
        const key = `${emitter.constructor.name}:${event}`;
        listenerCounts.set(key, (listenerCounts.get(key) || 0) + 1);

        if (listenerCounts.get(key) > 50) {
            console.warn(`⚠️  Potential EventEmitter leak: ${key} has ${listenerCounts.get(key)} listeners`);
        }
    }

    EventEmitter.prototype.addListener = function (event, listener) {
        trackListener(this, event);
        return originalAddListener.call(this, event, listener);
    };

    EventEmitter.prototype.on = function (event, listener) {
        trackListener(this, event);
        return originalOn.call(this, event, listener);
    };
}

// Timer leak detection
function detectTimerLeaks() {
    const originalSetInterval = global.setInterval;
    const originalSetTimeout = global.setTimeout;
    const activeTimers = new Set();

    global.setInterval = function (...args) {
        const id = originalSetInterval.apply(this, args);
        activeTimers.add(`interval-${id}`);
        return id;
    };

    global.setTimeout = function (...args) {
        const id = originalSetTimeout.apply(this, args);
        activeTimers.add(`timeout-${id}`);
        return id;
    };

    setInterval(() => {
        if (activeTimers.size > 100) {
            console.warn(`⚠️  High number of active timers: ${activeTimers.size}`);
        }
    }, 30000);
}

// Main execution
if (require.main === module) {
    const detector = new MemoryLeakDetector();

    // Enable leak detection
    detectEventEmitterLeaks();
    detectTimerLeaks();

    detector.start();

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("\nShutting down memory leak detector...");
        detector.stop();
        process.exit(0);
    });

    process.on("SIGTERM", () => {
        detector.stop();
        process.exit(0);
    });
}

module.exports = MemoryLeakDetector;
