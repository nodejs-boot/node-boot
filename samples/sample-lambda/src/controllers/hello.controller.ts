import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, from Node-Boot running on AWS Lambda!";
    }

    @Get("/info")
    async info(): Promise<Record<string, any>> {
        return {
            runtime: "aws-lambda",
            region: process.env["AWS_REGION"] ?? "local",
            functionName: process.env["AWS_LAMBDA_FUNCTION_NAME"] ?? "local",
        };
    }
}
