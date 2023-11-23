import { OpenApiAdapter, OpenApiOptions } from "@node-boot/context";
import { koaSwagger } from "koa2-swagger-ui";
import { OpenApiSpecAdapter } from "./OpenApiSpecAdapter";

export class KoaOpenApi implements OpenApiAdapter {
  bind(openApiOptions: OpenApiOptions, server: any, router: any): void {
    if (koaSwagger) {
      const { spec, options } = OpenApiSpecAdapter.adapt(openApiOptions);

      router.get(options.swaggerOptions.url, async (ctx) => {
        ctx.body = spec;
      });
      server.use(
        koaSwagger({
          routePrefix: "/api-docs",
          swaggerOptions: options.swaggerOptions
        })
      );
    } else {
      throw new Error(
        "Unable to initialize Swagger UI. 'koa2-swagger-ui' dependency is missing. " +
          "Please add it to your project by running:" +
          "\nnpm install koa2-swagger-ui" +
          "\nyarn add koa2-swagger-ui" +
          "\n or pnpm koa2-swagger-ui"
      );
    }
  }
}
