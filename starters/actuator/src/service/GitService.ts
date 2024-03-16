import propertiesReader from "properties-reader";
import dayjs from "dayjs";

export class GitService {
    private gitProperties?: any;

    async getGit(infoGitMode: "simple" | "full", dateFormat?: string) {
        const properties = await this.getGitFile();
        let gitInfo;
        if (properties !== undefined) {
            const time = dateFormat
                ? dayjs(properties.get("git.commit.time")).format(dateFormat)
                : properties.get("git.commit.time");

            if (infoGitMode === "simple") {
                gitInfo = {
                    branch: properties.get("git.branch"),
                    commit: {
                        id: properties.getRaw("gitInfo.commit.id.abbrev"),
                        time,
                    },
                };
            } else if (infoGitMode === "full") {
                gitInfo = {
                    branch: properties.get("git.branch"),
                    commit: {
                        id: properties.getRaw("gitInfo.commit.id.abbrev"),
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

        return gitInfo;
    }

    async getGitFile() {
        if (!this.gitProperties) {
            try {
                this.gitProperties = propertiesReader("git.properties");
            } catch (error) {
                // do nothing
            }
        }
        return this.gitProperties;
    }
}
