import {Optional} from "katxupa";

export type MaybeOptions<OptionsType> = {
    enabled?: boolean;
    options?: OptionsType;
};

export type ServerConfigOptions<
    CookieOptions = unknown,
    CorsOptions = unknown,
    SessionOptions = unknown,
    MultipartOptions = unknown,
    TemplateOptions = unknown,
> = {
    cookie?: MaybeOptions<CookieOptions>;
    cors?: MaybeOptions<CorsOptions>;
    session?: MaybeOptions<SessionOptions>;
    multipart?: MaybeOptions<MultipartOptions>;
    template?: MaybeOptions<TemplateOptions>;
};

export type ServerConfigProperties<
    TCookieProperties = unknown,
    TCorsProperties = unknown,
    TSessionProperties = unknown,
    TMultipartProperties = unknown,
    TTemplateProperties = unknown,
> = {
    cookie?: TCookieProperties;
    cors?: TCorsProperties;
    session?: TSessionProperties;
    multipart?: TMultipartProperties;
    template?: TTemplateProperties;
};

export class ServerConfig<T extends ServerConfigOptions> {
    private readonly value: T | undefined | null;

    private constructor(value: T | undefined | null) {
        this.value = value;
    }

    static of<T extends ServerConfigOptions>(value: T | undefined | null): ServerConfig<T> {
        return new ServerConfig<T>(value);
    }

    asOptional(): Optional<T> {
        return Optional.of(this.value);
    }

    configured<C>(optionsName: string): Optional<C | boolean | undefined> {
        const options = this.value?.[optionsName];
        if (options) {
            if (options.enabled !== undefined) {
                return options.enabled ? Optional.of(options.options) : Optional.empty();
            } else if (options.options) {
                return Optional.of(options.options);
            }
        }
        return Optional.empty();
    }

    ifCors(consumer: (value?: any) => void, not?: () => void): ServerConfig<T> {
        this.configured("cors")
            .ifEmpty(() => not?.())
            .ifPresent(options => this.consumerWrapper(options, consumer));
        return this;
    }

    ifCookies(consumer: (value?: any) => void, not?: () => void): ServerConfig<T> {
        this.configured("cookie")
            .ifEmpty(() => not?.())
            .ifPresent(options => this.consumerWrapper(options, consumer));
        return this;
    }

    ifSession(consumer: (value?: any) => void, not?: () => void): ServerConfig<T> {
        this.configured("session")
            .ifEmpty(() => not?.())
            .ifPresent(options => this.consumerWrapper(options, consumer));
        return this;
    }

    ifMultipart(consumer: (value?: any) => void, not?: () => void): ServerConfig<T> {
        this.configured("multipart")
            .ifEmpty(() => not?.())
            .ifPresent(options => this.consumerWrapper(options, consumer));
        return this;
    }

    ifTemplate(consumer: (value?: any) => void, not?: () => void): ServerConfig<T> {
        this.configured("template")
            .ifEmpty(() => not?.())
            .ifPresent(options => this.consumerWrapper(options, consumer));
        return this;
    }

    private consumerWrapper<T>(options: T | true, consumer: (value?: T) => void) {
        if (options === true) {
            // By default, use default configs
            consumer();
        } else {
            //If feature options is provided, set up the configuration
            consumer(options);
        }
    }
}
