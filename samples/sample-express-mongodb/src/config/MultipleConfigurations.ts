import {Configurations} from "@nodeboot/core";
import {SecurityConfiguration} from "./SecurityConfiguration";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";

@Configurations([SecurityConfiguration, ClassTransformConfiguration])
export class MultipleConfigurations {}
