import { Configuration, Configurations } from "@node-boot/core";
import { SecurityConfiguration } from "./SecurityConfiguration";
import { ClassTransformConfiguration } from "./ClassTransformConfiguration";

@Configuration()
@Configurations([SecurityConfiguration, ClassTransformConfiguration])
export class MultipleConfigurations {}
