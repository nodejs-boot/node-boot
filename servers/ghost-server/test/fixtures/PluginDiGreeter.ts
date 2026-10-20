import {Service} from "@nodeboot/core";

@Service()
export class PluginDiGreeter {
    greet(name: string): string {
        return `Hello, ${name}!`;
    }
}
