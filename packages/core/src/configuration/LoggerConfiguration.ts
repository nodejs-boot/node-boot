import { Logger } from "winston";
import { Configuration } from "../decorators";
import { Bean } from "@node-boot/context";
import { createLogger } from "../logger";

@Configuration()
export class LoggerConfiguration {
  @Bean()
  public logger(): Logger {
    return createLogger("node-boot-core", "node-boot");
  }
}
