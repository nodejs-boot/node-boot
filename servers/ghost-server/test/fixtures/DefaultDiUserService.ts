import {Service} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {DefaultDiGreetingService} from "./DefaultDiGreetingService";

/**
 * Constructor-injected (not property-injected like `UserService`), with every param explicitly
 * `@Inject()`-annotated: Node-Boot's default (Nonna) container is zero-reflection and constructor
 * -only, so a class relying on it - without running the `@nonnajs/compiler` AOT step - must spell
 * out every dependency's token this way.
 */
@Service()
export class DefaultDiUserService {
    constructor(
        @Inject(DefaultDiGreetingService) private readonly greetingService: DefaultDiGreetingService,
        @Inject("default-di-app-name") private readonly appName: string,
    ) {}

    welcome(name: string): string {
        return `${this.greetingService.greet(name)} Welcome to ${this.appName}.`;
    }
}
