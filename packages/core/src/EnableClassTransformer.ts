import {ApplicationContext} from "../ApplicationContext";
import {ClassTransformOptions} from "class-transformer";
import {TransformerOptions} from "./TransformerOptions";

export function ClassToPlainTransform(options: ClassTransformOptions): Function {

  return function (target: Function) {

    ApplicationContext.get()
      .classToPlainTransformOptions = options;
  };
}

export function PlainToClassTransform(options: ClassTransformOptions): Function {

  return function (target: Function) {

    ApplicationContext.get()
      .plainToClassTransformOptions = options;
  };
}

export function EnableClassTransformer(options?: TransformerOptions): Function {

  return function (target: Function) {

    ApplicationContext.get()
      .classTransformer = options?.enabled ?? true;

    ApplicationContext.get()
      .classToPlainTransformOptions = options?.classToPlain;

    ApplicationContext.get()
      .plainToClassTransformOptions = options?.plainToClass;
  };
}
