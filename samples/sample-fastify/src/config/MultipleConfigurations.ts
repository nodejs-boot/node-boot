import {Configuration, Configurations} from "@node-boot/core";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";
import {SecurityConfiguration} from "./SecurityConfiguration";

@Configuration()
@Configurations([SecurityConfiguration, ClassTransformConfiguration])
export class MultipleConfigurations {}
