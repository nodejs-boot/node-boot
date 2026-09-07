import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {AiConfigProperties} from "./types";
import {ChatMemoryRepository, InMemoryChatMemoryRepository, MessageWindowChatMemory} from "../chat/memory";
import {ToolRegistry} from "../tool";

/**
 * Auto-configuration for NodeBoot AI core.
 */
@Configuration()
export class AiConfiguration {
    @Bean()
    public configureAi({logger, config, iocContainer}: BeansContext): void {
        logger.info("🤖 Configuring NodeBoot AI Core");

        const aiConfig = config.getOptional<AiConfigProperties>("ai");

        // Register default In-Memory ChatMemoryRepository if not already provided
        try {
            if (!iocContainer.has("ChatMemoryRepository")) {
                iocContainer.set("ChatMemoryRepository", new InMemoryChatMemoryRepository());
            }
        } catch {
            iocContainer.set("ChatMemoryRepository", new InMemoryChatMemoryRepository());
        }

        // Register default MessageWindowChatMemory (backed by the ChatMemoryRepository above) if not already provided
        try {
            if (!iocContainer.has("ChatMemory")) {
                iocContainer.set(
                    "ChatMemory",
                    MessageWindowChatMemory.builder()
                        .chatMemoryRepository(iocContainer.get<ChatMemoryRepository>("ChatMemoryRepository"))
                        .build(),
                );
            }
        } catch {
            iocContainer.set("ChatMemory", MessageWindowChatMemory.builder().build());
        }

        // Register ToolRegistry
        iocContainer.set(ToolRegistry, ToolRegistry.get());

        if (aiConfig) {
            logger.info(`🤖 AI Provider configured: ${aiConfig.provider ?? "custom"}`);
        }
    }
}
