import {Configurations} from "@nodeboot/core";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";
import {CustomNamingStrategy} from "../persistence";

@Configurations([ClassTransformConfiguration, CustomNamingStrategy])
export class MultipleConfigurations {}
