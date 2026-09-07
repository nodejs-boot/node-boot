import {describe, it, beforeEach, afterEach, mock} from "node:test";
import assert from "node:assert/strict";

import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    Min,
    MinLength,
    registerDecorator,
    validate,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidatorOptions,
} from "class-validator";

import {ApplicationContext} from "@nodeboot/context";
import {ValidationsConfiguration} from "../src/config";

/**
 * Resolves `ValidatorOptions` the same way the running application does: by feeding an
 * `api.validations` config value through the real `@Bean` factory in `ValidationsConfiguration`
 * and reading back whatever it stores on `ApplicationContext`.
 */
function resolveValidatorOptions(apiValidationsConfig: ValidatorOptions): ValidatorOptions {
    const config = {getOptional: () => apiValidationsConfig} as any;
    const logger = {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        child: mock.fn(),
    };

    new ValidationsConfiguration().validationConfig({logger, config} as any);

    return ApplicationContext.get().validation as ValidatorOptions;
}

// A custom, non-builtin validator, defined the same way an application would define one:
// a `ValidatorConstraint` class plus a decorator factory built on `registerDecorator`.
@ValidatorConstraint({name: "isEven", async: false})
class IsEvenConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        return typeof value === "number" && value % 2 === 0;
    }

    defaultMessage(args: ValidationArguments): string {
        return `${args.property} must be an even number`;
    }
}

function IsEven(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsEvenConstraint,
        });
    };
}

class UserDto {
    @IsEmail()
    email!: string;

    @IsNotEmpty()
    @MinLength(3)
    name!: string;

    @IsInt()
    @Min(0)
    age!: number;

    @IsEven()
    luckyNumber!: number;
}

class GroupedDto {
    @IsEmail({}, {groups: ["create"]})
    email!: string;

    @MinLength(6, {groups: ["update"]})
    password!: string;
}

describe("class-validator options resolved via ValidationsConfiguration", () => {
    let originalValidation: any;

    beforeEach(() => {
        originalValidation = ApplicationContext.get().validation;
    });

    afterEach(() => {
        ApplicationContext.get().validation = originalValidation;
    });

    describe("built-in validators", () => {
        it("passes a DTO that satisfies every built-in constraint", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new UserDto(), {
                email: "jane@example.com",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
            });

            const errors = await validate(dto, options);

            assert.deepEqual(errors, []);
        });

        it("reports one error per built-in constraint that fails", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new UserDto(), {
                email: "not-an-email",
                name: "a",
                age: -1,
                luckyNumber: 4,
            });

            const errors = await validate(dto, options);
            const failedProperties = errors.map(error => error.property).sort();

            assert.deepEqual(failedProperties, ["age", "email", "name"]);
        });
    });

    describe("custom validators", () => {
        it("passes when the custom constraint is satisfied", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new UserDto(), {
                email: "jane@example.com",
                name: "Jane",
                age: 30,
                luckyNumber: 8,
            });

            const errors = await validate(dto, options);

            assert.deepEqual(errors, []);
        });

        it("fails with the custom constraint's own error message when violated", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new UserDto(), {
                email: "jane@example.com",
                name: "Jane",
                age: 30,
                luckyNumber: 7,
            });

            const errors = await validate(dto, options);
            const luckyNumberError = errors.find(error => error.property === "luckyNumber");

            assert.ok(luckyNumberError);
            assert.deepEqual(luckyNumberError.constraints, {isEven: "luckyNumber must be an even number"});
        });
    });

    describe("whitelist / forbidNonWhitelisted", () => {
        it("silently strips properties with no validation decorators when only 'whitelist' is set", async () => {
            const options = resolveValidatorOptions({whitelist: true});
            const dto: any = Object.assign(new UserDto(), {
                email: "jane@example.com",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
                extra: "not declared on the DTO",
            });

            const errors = await validate(dto, options);

            assert.deepEqual(errors, []);
            assert.equal("extra" in dto, false);
        });

        it("reports a whitelist error instead of stripping when 'forbidNonWhitelisted' is also set", async () => {
            const options = resolveValidatorOptions({whitelist: true, forbidNonWhitelisted: true});
            const dto: any = Object.assign(new UserDto(), {
                email: "jane@example.com",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
                extra: "not declared on the DTO",
            });

            const errors = await validate(dto, options);
            const extraError = errors.find(error => error.property === "extra");

            assert.ok(extraError);
            assert.ok(extraError.constraints?.["whitelistValidation"]);
        });
    });

    describe("skipMissingProperties", () => {
        it("fails validation for a missing required property by default", async () => {
            const options = resolveValidatorOptions({});
            const dto: any = new UserDto();
            dto.email = "jane@example.com";
            dto.age = 30;
            dto.luckyNumber = 4;
            // `name` intentionally left undefined.

            const errors = await validate(dto, options);

            assert.ok(errors.some(error => error.property === "name"));
        });

        it("skips validation for missing (undefined) properties when 'skipMissingProperties' is set", async () => {
            const options = resolveValidatorOptions({skipMissingProperties: true});
            const dto: any = new UserDto();
            dto.email = "jane@example.com";
            dto.age = 30;
            dto.luckyNumber = 4;
            // `name` intentionally left undefined.

            const errors = await validate(dto, options);

            assert.deepEqual(errors, []);
        });
    });

    describe("groups", () => {
        it("only validates decorators tagged with the active group", async () => {
            const createOptions = resolveValidatorOptions({groups: ["create"]});
            const dto = Object.assign(new GroupedDto(), {email: "not-an-email", password: "short"});

            const errors = await validate(dto, createOptions);

            assert.deepEqual(
                errors.map(error => error.property),
                ["email"],
            );
        });

        it("switches which decorators run when the active group changes", async () => {
            const updateOptions = resolveValidatorOptions({groups: ["update"]});
            const dto = Object.assign(new GroupedDto(), {email: "not-an-email", password: "short"});

            const errors = await validate(dto, updateOptions);

            assert.deepEqual(
                errors.map(error => error.property),
                ["password"],
            );
        });
    });

    describe("stopAtFirstError", () => {
        class MultiConstraintDto {
            @IsEmail()
            @MinLength(30)
            email!: string;
        }

        it("collects every failing constraint for a property by default", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new MultiConstraintDto(), {email: "no"});

            const errors = await validate(dto, options);

            assert.equal(Object.keys(errors[0]!.constraints ?? {}).length, 2);
        });

        it("stops after the first failing constraint per property when 'stopAtFirstError' is set", async () => {
            const options = resolveValidatorOptions({stopAtFirstError: true});
            const dto = Object.assign(new MultiConstraintDto(), {email: "no"});

            const errors = await validate(dto, options);

            assert.equal(Object.keys(errors[0]!.constraints ?? {}).length, 1);
        });
    });

    describe("dismissDefaultMessages", () => {
        it("clears the default error message when no custom message was provided", async () => {
            const options = resolveValidatorOptions({dismissDefaultMessages: true});
            const dto = Object.assign(new UserDto(), {
                email: "not-an-email",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
            });

            const errors = await validate(dto, options);
            const emailError = errors.find(error => error.property === "email");

            assert.equal(emailError?.constraints?.["isEmail"], "");
        });
    });

    describe("skipUndefinedProperties / skipNullProperties", () => {
        class NullableDto {
            @IsNotEmpty()
            name!: string | null | undefined;
        }

        it("by default validates both null and undefined properties", async () => {
            const options = resolveValidatorOptions({});

            const undefinedDto = new NullableDto();
            const nullDto = Object.assign(new NullableDto(), {name: null});

            assert.equal((await validate(undefinedDto, options)).length, 1);
            assert.equal((await validate(nullDto, options)).length, 1);
        });

        it("'skipUndefinedProperties' skips only undefined properties, not null ones", async () => {
            const options = resolveValidatorOptions({skipUndefinedProperties: true});

            const undefinedDto = new NullableDto();
            const nullDto = Object.assign(new NullableDto(), {name: null});

            assert.deepEqual(await validate(undefinedDto, options), []);
            assert.equal((await validate(nullDto, options)).length, 1);
        });

        it("'skipNullProperties' skips only null properties, not undefined ones", async () => {
            const options = resolveValidatorOptions({skipNullProperties: true});

            const undefinedDto = new NullableDto();
            const nullDto = Object.assign(new NullableDto(), {name: null});

            assert.equal((await validate(undefinedDto, options)).length, 1);
            assert.deepEqual(await validate(nullDto, options), []);
        });
    });

    describe("strictGroups", () => {
        class StrictGroupDto {
            @MinLength(6, {groups: ["create"]})
            password!: string;
        }

        it("by default still validates group-tagged decorators when no groups are requested", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new StrictGroupDto(), {password: "short"});

            const errors = await validate(dto, options);

            assert.equal(errors.length, 1);
        });

        it("excludes group-tagged decorators when 'strictGroups' is set and no groups are requested", async () => {
            // `forbidUnknownValues` is disabled here so that excluding the only decorator on this DTO
            // surfaces as "no errors" rather than the unrelated "unknown value" fallback error.
            const options = resolveValidatorOptions({strictGroups: true, forbidUnknownValues: false});
            const dto = Object.assign(new StrictGroupDto(), {password: "short"});

            const errors = await validate(dto, options);

            assert.deepEqual(errors, []);
        });
    });

    describe("always", () => {
        class MixedGroupDto {
            // No groups declared: excluded from group-filtered validation unless `always` applies.
            @IsNotEmpty()
            plainField!: string;

            @MinLength(6, {groups: ["create"]})
            groupedField!: string;
        }

        it("by default excludes ungrouped decorators once a 'groups' filter is active", async () => {
            // Both decorators end up excluded (neither matches the "update" group), so
            // `forbidUnknownValues` is disabled to isolate that from the unrelated fallback error.
            const options = resolveValidatorOptions({groups: ["update"], forbidUnknownValues: false});
            const dto = Object.assign(new MixedGroupDto(), {plainField: "", groupedField: "short"});

            const errors = await validate(dto, options);

            assert.deepEqual(errors, []);
        });

        it("'always' forces ungrouped decorators to keep validating regardless of the active groups", async () => {
            const options = resolveValidatorOptions({groups: ["update"], always: true});
            const dto = Object.assign(new MixedGroupDto(), {plainField: "", groupedField: "short"});

            const errors = await validate(dto, options);

            assert.deepEqual(
                errors.map(error => error.property),
                ["plainField"],
            );
        });
    });

    describe("forbidUnknownValues", () => {
        class UndecoratedDto {}

        it("fails by default for a plain object with no validation metadata", async () => {
            const options = resolveValidatorOptions({});

            const errors = await validate(new UndecoratedDto(), options);

            assert.equal(errors.length, 1);
            assert.ok(errors[0]!.constraints?.["unknownValue"]);
        });

        it("passes an unknown object when 'forbidUnknownValues' is disabled", async () => {
            const options = resolveValidatorOptions({forbidUnknownValues: false});

            const errors = await validate(new UndecoratedDto(), options);

            assert.deepEqual(errors, []);
        });
    });

    describe("validationError.target / validationError.value", () => {
        it("exposes both the target instance and the invalid value by default", async () => {
            const options = resolveValidatorOptions({});
            const dto = Object.assign(new UserDto(), {
                email: "not-an-email",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
            });

            const [emailError] = await validate(dto, options);

            assert.equal(emailError!.target, dto);
            assert.equal(emailError!.value, "not-an-email");
        });

        it("omits the target instance when 'validationError.target' is false", async () => {
            const options = resolveValidatorOptions({validationError: {target: false}});
            const dto = Object.assign(new UserDto(), {
                email: "not-an-email",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
            });

            const [emailError] = await validate(dto, options);

            assert.equal(emailError!.target, undefined);
        });

        it("omits the invalid value when 'validationError.value' is false", async () => {
            const options = resolveValidatorOptions({validationError: {value: false}});
            const dto = Object.assign(new UserDto(), {
                email: "not-an-email",
                name: "Jane",
                age: 30,
                luckyNumber: 4,
            });

            const [emailError] = await validate(dto, options);

            assert.equal(emailError!.value, undefined);
        });
    });
});
