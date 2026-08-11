---
name: nodeboot-starter-validation
description: Use when the user wants request DTO validation in a Node-Boot app with `@nodeboot/starter-validation`; this starter is enabled with `@EnableValidations()` and works with `class-validator` decorators on models passed through `@Body`, `@Param`, `@QueryParam`, and related parameter decorators.
---

# `@nodeboot/starter-validation`

Use this starter when request DTOs should be rejected automatically instead of manually validated in every controller action. It layers `class-validator` onto Node-Boot request binding.

## Enable

```ts
@EnableDI(Container)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class App implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Minimal DTO + controller usage

```ts
export class UserDto {
    @IsEmail()
    email: string;

    @MinLength(6)
    password: string;
}

@Post("/login")
login(@Body({validate: true}) user: UserDto) {}
```

## Key config

There is no `integrations.*` block; validation options live under `api.validations` (`whitelist`, `forbidNonWhitelisted`, `stopAtFirstError`, and related `class-validator` flags).

Full docs: [`starters/validation/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/validation/README.md)

## Validate

`cd samples/sample-express && pnpm dev`
