import {ClassTransformOptions} from "class-transformer";

export type TransformerOptions = {
    enabled?: boolean;
    classToPlain?: ClassTransformOptions;
    plainToClass?: ClassTransformOptions;
};
