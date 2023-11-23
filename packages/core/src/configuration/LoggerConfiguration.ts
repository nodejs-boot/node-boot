import { Logger } from "winston";
import { Bean, Configuration } from "../decorators";
import { createLogger } from "../logger";

@Configuration()
export class LoggerConfiguration {
  @Bean()
  public logger(): Logger {
    return createLogger("node-boot-core", "node-boot");
  }
}
