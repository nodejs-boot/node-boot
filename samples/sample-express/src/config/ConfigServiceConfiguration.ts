import { Configuration } from "@node-boot/core";
import { Bean } from "@node-boot/context";
import { ConfigService, loadNodeBootConfig } from "@node-boot/config";

@Configuration()
export class ConfigServiceConfiguration {
  @Bean("config")
  public async config(): Promise<ConfigService> {
    return (
      await loadNodeBootConfig({
        argv: process.argv
      })
    ).config;
  }
}
