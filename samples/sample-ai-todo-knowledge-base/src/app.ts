import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";
import {EnableDI} from "@nodeboot/di";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableValidations} from "@nodeboot/starter-validation";
import {EnableComponentScan} from "@nodeboot/aot";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableAi} from "@nodeboot/ai-core";
import {EnableGoogleGenAiModels} from "@nodeboot/ai-google-genai";

/**
 * AI Todo Knowledge Base sample: a regular Todo REST API (`TodoController`) plus a generative-AI
 * layer (`AiController` -> `AiKnowledgeBaseService`) that lets users query and manage their todos
 * in natural language, powered by Google Gemini (`gemini-3.5-flash-lite`, see app-config.yaml).
 */
@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@EnableRepositories()
@EnableValidations()
@EnableAi()
@EnableGoogleGenAiModels()
@EnableComponentScan()
@NodeBootApplication()
export class AiTodoKnowledgeBaseApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
