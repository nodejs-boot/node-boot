import { Configuration, createLogger } from "@node-boot/core";
import { Bean } from "@node-boot/context";
import { Logger } from "winston";

@Configuration()
export class LoggerConfiguration {
  @Bean()
  public logger(): Logger {
    return createLogger("facts-service", "tech-insights");
  }
}
