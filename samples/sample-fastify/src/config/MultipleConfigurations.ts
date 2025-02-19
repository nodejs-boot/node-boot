import {Configuration, Configurations} from "@nodeboot/core";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";
import {SecurityConfiguration} from "./SecurityConfiguration";

@Configuration()
@Configurations([SecurityConfiguration, ClassTransformConfiguration])
export class MultipleConfigurations {}
