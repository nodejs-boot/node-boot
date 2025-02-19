import {Configuration, Configurations} from "@nodeboot/core";
import {SecurityConfiguration} from "./SecurityConfiguration";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";

@Configuration()
@Configurations([SecurityConfiguration, ClassTransformConfiguration])
export class MultipleConfigurations {}
