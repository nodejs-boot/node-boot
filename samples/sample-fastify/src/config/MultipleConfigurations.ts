import {Configuration, Configurations} from "@node-boot/core";
import {ClassTransformConfiguration} from "./ClassTransformConfiguration";

@Configuration()
@Configurations([ClassTransformConfiguration])
export class MultipleConfigurations {}
