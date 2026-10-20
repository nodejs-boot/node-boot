import {DiOptions, InjectionOptions} from "./types";
import {decorateInjection} from "./makeInjectionDecoration";

/**
 * DI plugin support.
 *
 * Node-Boot's default container is Nonna, and every `@Component`/`@Service`/`@Inject` always registers with
 * it. An application can instead plug in another container with `@EnableDI(container)` - for example
 * TypeDI's `Container` or an Inversify container. Those libraries need their own class and injection
 * decorators applied to each bean.
 *
 * Class decorators run at import time, usually before `@EnableDI(...)` has been evaluated, so every
 * decoration is recorded here and replayed through the plugin library once `@EnableDI(...)` activates the
 * plugin. Decorations made after activation are applied immediately. Applications that never call
 * `@EnableDI(...)` never touch TypeDI or Inversify, even when those libraries happen to be installed.
 */
type PluginDecoration =
    | {kind: "class"; target: Function; options?: DiOptions}
    | {
          kind: "inject";
          target: object;
          propertyName: string | symbol;
          index?: number;
          options?: InjectionOptions;
      };

const recorded: PluginDecoration[] = [];
let pluginActive = false;

function apply(decoration: PluginDecoration): void {
    if (decoration.kind === "class") {
        decorateClassWithPlugin(decoration.target, decoration.options);
    } else {
        decorateInjection(decoration.target, decoration.propertyName, decoration.index, decoration.options);
    }
}

/** Records a decoration, applying it right away when a DI plugin is already active. */
export function recordPluginDecoration(decoration: PluginDecoration): void {
    recorded.push(decoration);
    if (pluginActive) {
        apply(decoration);
    }
}

/** Activates the DI plugin and replays every decoration recorded so far. Idempotent. */
export function activateDiPlugin(): void {
    if (pluginActive) return;
    pluginActive = true;
    for (const decoration of recorded) {
        apply(decoration);
    }
}

export function isDiPluginActive(): boolean {
    return pluginActive;
}

/** Test hook: forgets recorded decorations and deactivates the plugin. */
export function resetDiPlugin(): void {
    recorded.length = 0;
    pluginActive = false;
}

/** Applies the class decorator of the installed plugin library (TypeDI's `@Service`, else Inversify's `@injectable`). */
function decorateClassWithPlugin(target: Function, options?: DiOptions): boolean {
    try {
        require("typedi").Service(options)(target);
        return true;
    } catch (error) {
        if ((error as {code?: string}).code !== "MODULE_NOT_FOUND") {
            throw error;
        }
    }
    try {
        require("inversify").injectable()(target);
        return true;
    } catch {
        return false;
    }
}
