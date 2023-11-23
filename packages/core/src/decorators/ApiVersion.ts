export const ENDPOINT_VERSION_METADATA_KEY = Symbol("Version");

export function ApiVersion(version: number): Function {
  return function (target: Function) {
    Reflect.defineMetadata(ENDPOINT_VERSION_METADATA_KEY, version, target);
  };
}
