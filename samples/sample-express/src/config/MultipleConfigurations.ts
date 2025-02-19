import {Configurations} from "@nodeboot/core";
import {SecurityConfiguration} from "./SecurityConfiguration";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";
import {CustomNamingStrategy} from "../persistence";

@Configurations([SecurityConfiguration, ClassTransformConfiguration, CustomNamingStrategy])
export class MultipleConfigurations {}
