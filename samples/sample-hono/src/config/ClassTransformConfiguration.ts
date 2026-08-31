import {ClassToPlainTransform, EnableClassTransformer, PlainToClassTransform} from "@nodeboot/core";

@EnableClassTransformer({enabled: false})
@ClassToPlainTransform({
    strategy: "exposeAll",
})
@PlainToClassTransform({
    strategy: "exposeAll",
})
export class ClassTransformConfiguration {}
