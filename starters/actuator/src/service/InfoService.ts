import os from "os";
import v8 from "v8";
import propertiesReader from "properties-reader";
import * as fs from "fs";
import {ConfigCache} from "./ConfigCache";
import dayjs from "dayjs";
import {Info, MemoryInfo} from "../types";

export class InfoService {
    constructor(private readonly cache: ConfigCache = new ConfigCache()) {}

    async getInfo(): Promise<Info> {
        return {
            host: os.hostname(),
            nodeVersion: process.versions.node,
            loadAvg: os.loadavg(),
            uptime: process.uptime(),
            build: await this.getBuild(),
            git: await this.getGit("full"),
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

    async getBuild() {
        const packageJson = await this.getPackageJsonFile();

        let build;
        if (packageJson !== undefined) {
            build = {
                name: packageJson.name,
                description: packageJson.description,
                version: packageJson.version,
                repository: packageJson.repository,
                engines: packageJson.engines,
                license: packageJson.license,
                keywords: packageJson.keywords,
            };
        }

        return build;
    }

    async getPackageJsonFile() {
        let packageJson = this.cache.get("packageJson");
        if (packageJson === undefined) {
            try {
                const packageFile = fs.readFileSync("./package.json", "utf8");
                packageJson = JSON.parse(packageFile);
                this.cache.set("packageJson", packageJson);
            } catch (err) {
                // Error getting and parsing package.json
            }
        }
        return packageJson;
    }

    async getGit(infoGitMode: "simple" | "full", dateFormat?: string) {
        const properties = await this.getGitFile();
        let git;

        if (properties !== undefined) {
            const time = dateFormat
                ? dayjs(properties.get("git.commit.time")).format(dateFormat)
                : properties.get("git.commit.time");

            if (infoGitMode === "simple") {
                git = {
                    branch: properties.get("git.branch"),
                    commit: {
                        id: properties.getRaw("git.commit.id.abbrev"),
                        time,
                    },
                };
            } else if (infoGitMode === "full") {
                git = {
                    branch: properties.get("git.branch"),
                    commit: {
                        id: properties.getRaw("git.commit.id.abbrev"),
                        idFull: properties.get("git.commit.id"),
                        time,
                        user: {
                            email: properties.get("git.commit.user.email"),
                            name: properties.get("git.commit.user.name"),
                        },
                        message: {
                            full: properties.get("git.commit.message.full"),
                            short: properties.get("git.commit.message.short"),
                        },
                    },
                };
            }
        }

        return git;
    }

    async getGitFile() {
        let properties = this.cache.get("properties");
        if (properties === undefined) {
            try {
                properties = propertiesReader("git.properties");
                this.cache.set("properties", properties);
            } catch (error) {
                // do nothing
            }
        }
        return properties;
    }
}
