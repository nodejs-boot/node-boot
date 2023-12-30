import {ApplicationContext, TransformerOptions} from "@node-boot/context";
import {ClassTransformOptions} from "class-transformer";

export function ClassToPlainTransform(options: ClassTransformOptions): Function {
    return function () {
        ApplicationContext.get().classToPlainTransformOptions = options;
    };
}

export function PlainToClassTransform(options: ClassTransformOptions): Function {
    return function () {
        ApplicationContext.get().plainToClassTransformOptions = options;
    };
}

export function EnableClassTransformer(options?: TransformerOptions): Function {
    return function () {
        ApplicationContext.get().classTransformer = options?.enabled ?? true;

        ApplicationContext.get().classToPlainTransformOptions = options?.classToPlain;

        ApplicationContext.get().plainToClassTransformOptions = options?.plainToClass;
    };
}
