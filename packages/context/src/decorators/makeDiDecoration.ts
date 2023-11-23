import { Service } from "typedi";
import { ComponentOptions } from "../options/ComponentOptions";
import { Token } from "../di/Token";

export type DiOptions = ComponentOptions | string | Token<unknown>;

/**
 * Apply dependency injection decorator if dependency injection framework is available
 * */
export function decorateDi<TFunction>(
  target: TFunction,
  options?: DiOptions
): boolean {
  return decorateTypeDi(target, options) || decorateInversify(target);
}

/**
 * Apply @Service decorator if TypeDI framework is available
 * */
function decorateTypeDi<TFunction>(
  target: TFunction,
  options?: DiOptions
): boolean {
  let decorated: boolean;
  try {
    const { Service } = require("typedi");
    Service(options)(target);
    decorated = true;
  } catch (error) {
    // TypeDi is not available
    console.warn(
      "@Service decorator is only applied if 'TypeDi' dependency is available!"
    );
    decorated = false;
  }
  return decorated;
}

/**
 * Apply @injectable decorator if Inversify framework is available
 * */
function decorateInversify<TFunction>(target: TFunction): boolean {
  let decorated: boolean;
  try {
    const { injectable } = require("inversify");
    injectable()(target);
    decorated = true;
  } catch (error) {
    // Inversify is not available
    console.warn(
      "@injectable decorator is only applied if 'Inversify' dependency is available!"
    );
    decorated = false;
  }
  return decorated;
}
