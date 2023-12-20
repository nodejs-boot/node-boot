import {ClassToPlainTransform, EnableClassTransformer, PlainToClassTransform} from "@node-boot/core";

@EnableClassTransformer({enabled: false})
@ClassToPlainTransform({
    strategy: "exposeAll",
})
@PlainToClassTransform({
    strategy: "exposeAll",
})
export class ClassTransformConfiguration {}
