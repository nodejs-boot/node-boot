import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {BedrockModelConfigProperties} from "./types";
import {BedrockChatModel} from "../BedrockChatModel";
import {BedrockEmbeddingModel} from "../BedrockEmbeddingModel";

/**
 * Auto-configuration for Amazon Bedrock models in NodeBoot AI.
 */
@Configuration()
export class BedrockAutoConfiguration {
    @Bean()
    public configureBedrockModels({logger, config, iocContainer}: BeansContext): void {
        const bedrockConfig = config.getOptional<BedrockModelConfigProperties>("ai.bedrock");

        if (bedrockConfig) {
            try {
                let bedrockRuntimeClient: any;
                try {
                    bedrockRuntimeClient = require("@aws-sdk/client-bedrock-runtime");
                } catch {
                    bedrockRuntimeClient = undefined;
                }

                if (bedrockRuntimeClient) {
                    const {BedrockRuntimeClient, ConverseCommand, InvokeModelCommand} = bedrockRuntimeClient;
                    const client = new BedrockRuntimeClient({
                        region: bedrockConfig.region,
                        credentials:
                            bedrockConfig.accessKeyId && bedrockConfig.secretAccessKey
                                ? {
                                      accessKeyId: bedrockConfig.accessKeyId,
                                      secretAccessKey: bedrockConfig.secretAccessKey,
                                      sessionToken: bedrockConfig.sessionToken,
                                  }
                                : undefined,
                    });

                    const chatModel = new BedrockChatModel(
                        {
                            converse: (params: any) => client.send(new ConverseCommand(params)),
                        },
                        bedrockConfig.chat?.options,
                    );
                    const embeddingModel = new BedrockEmbeddingModel(
                        {
                            invokeModel: (params: any) => client.send(new InvokeModelCommand(params)),
                        },
                        bedrockConfig.embedding?.options,
                    );

                    iocContainer.set(BedrockChatModel, chatModel);
                    iocContainer.set(BedrockEmbeddingModel, embeddingModel);

                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 Bedrock ChatModel, EmbeddingModel, and ChatClient successfully configured");
                } else {
                    logger.warn(
                        "🤖 Amazon Bedrock runtime package not found. Please install '@aws-sdk/client-bedrock-runtime' as a dependency.",
                    );
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Bedrock models:", err);
            }
        }
    }
}
