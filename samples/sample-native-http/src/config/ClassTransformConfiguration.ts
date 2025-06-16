import {ClassToPlainTransform, Configuration, EnableClassTransformer, PlainToClassTransform} from "@nodeboot/core";

@Configuration()
@EnableClassTransformer({enabled: false})
@ClassToPlainTransform({
    strategy: "exposeAll",
})
@PlainToClassTransform({
    strategy: "exposeAll",
})
export class ClassTransformConfiguration {}
