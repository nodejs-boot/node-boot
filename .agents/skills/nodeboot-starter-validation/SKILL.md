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

`cd samples/sample-express && pnpm dev` for a manual check.

For automated proof that `@EnableValidations()` actually autowires (not just that `class-validator`
decorators work, which the framework validates by default with or without this starter), see
`starters/validation/test/validation-enabled.it.test.ts` and `validation-disabled.it.test.ts`: two
`useNodeBoot()`-booted apps, identical except one applies `@EnableValidations()` with a custom
`api.validations` config (`whitelist`/`forbidNonWhitelisted`) and one doesn't — the same request
(an extra, undeclared body property) is rejected by one and accepted by the other. That contrast is
what proves the starter's config wiring is the cause, not a coincidence. See
`nodeboot-extending-nodeboot`'s "Testing a starter package" section before writing this style of
test for a different starter.
