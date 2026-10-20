import {Service} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {PluginDiGreeter} from "./PluginDiGreeter";

/** Property-injected, the way TypeDI wants it: a lazy type resolver. */
@Service()
export class PluginDiUserService {
    @Inject(() => PluginDiGreeter)
    private readonly greeter!: PluginDiGreeter;

    welcome(name: string): string {
        return `${this.greeter.greet(name)} (resolved through TypeDI)`;
    }
}
