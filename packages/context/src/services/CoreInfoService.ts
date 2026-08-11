import {BuildInfo, Info, MemoryInfo} from "./types";
import os from "os";
import v8 from "v8";
import fs from "fs";
import {LoggerService} from "./LoggerService";
import {ApplicationContext} from "../ApplicationContext";
import {getActiveProfiles} from "../decorators";

export class CoreInfoService {
    private buildInfo?: BuildInfo;

    constructor(private readonly logger: LoggerService) {}

    async getInfo(): Promise<Info> {
        return {
            host: os.hostname(),
            nodeVersion: process.versions.node,
            loadAvg: os.loadavg(),
            uptime: process.uptime(),
            build: await this.getBuild(),
            activeProfiles: getActiveProfiles(),
        };
    }

    async getMemory(): Promise<MemoryInfo> {
        return {
            freeMem: os.freemem(),
            heapSpace: v8.getHeapSpaceStatistics(),
            memoryUsage: process.memoryUsage(),
            totalMem: os.totalmem(),
            heap: v8.getHeapStatistics(),
            heapCodeStatistics: v8.getHeapCodeStatistics(),
        };
    }

    async getBuild(): Promise<BuildInfo | undefined> {
        if (!this.buildInfo) {
            const packageJson = await this.getPackageJsonFile();

            if (packageJson !== undefined) {
                const serverType = ApplicationContext.get().serverType;
                const dependencies = packageJson.dependencies as any;
                this.buildInfo = {
                    name: packageJson.name,
                    description: packageJson.description,
                    version: packageJson.version,
                    repository: packageJson.repository,
                    engines: packageJson.engines,
                    license: packageJson.license,
                    keywords: packageJson.keywords,
                    nodeBoot: dependencies["@nodeboot/core"],
                    serverFramework: serverType.toUpperCase(),
                    serverVersion: dependencies[serverType.toLowerCase()],
                };
            }
        }
        return this.buildInfo;
    }

    private async getPackageJsonFile() {
        try {
            const packageFile = fs.readFileSync("./package.json", "utf8");
            return JSON.parse(packageFile);
        } catch (e: any) {
            // Reading `./package.json` from disk is expected to fail in filesystem-less runtimes
            // (e.g. Cloudflare Workers and other edge/sandboxed environments). This is a
            // non-fatal, best-effort lookup used only to populate optional build/version info in
            // the startup banner, so we log it as a warning rather than an error.
            this.logger.warn(
                `Could not read application package.json to populate build info (this is expected in filesystem-less runtimes): ${e.message}`,
            );
        }
    }
}
