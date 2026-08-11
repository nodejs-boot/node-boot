# Core decorators — quick reference

Full purpose + example for each of these lives in
[`USAGE_GUIDE.md` § Core Framework](https://github.com/nodejs-boot/node-boot/blob/main/USAGE_GUIDE.md#-core-framework-nodebootcore).
This table is only a fast lookup index — follow the anchor link for the real explanation before
using an unfamiliar decorator.

| Category                 | Decorators                                                                                                                                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap                | `@NodeBootApplication(options?)`, `@Controllers([...])`, `@GlobalMiddlewares([...])`, `@Interceptors([...])`, `@Configurations([...])`                                                                                                                   |
| DI markers               | `@Component()`, `@Service()`                                                                                                                                                                                                                             |
| Config & beans           | `@Configuration(options?)`, `@Bean(name?)`, `@Profile([...])`                                                                                                                                                                                            |
| Controllers & routing    | `@Controller(baseRoute?, version?, options?)`, `@Get/@Post/@Put/@Patch/@Delete/@Head/@All/@Method`                                                                                                                                                       |
| Request params           | `@Param`, `@Params`, `@QueryParam`, `@QueryParams`, `@Body`, `@BodyParam`, `@HeaderParam`, `@HeaderParams`, `@CookieParam`, `@CookieParams`, `@Session`, `@SessionParam`, `@State`, `@UploadedFile`, `@UploadedFiles`, `@Req`, `@Res`, `@Ctx` (Koa only) |
| Response                 | `@HttpCode(code)`, `@ContentType(type)`, `@Header(name, value)`, `@Redirect(url)`, `@Location(url)`                                                                                                                                                      |
| Middlewares/interceptors | `@Middleware(options?)`, `@ErrorHandler()`, `@Interceptor()`                                                                                                                                                                                             |
| Models & validation      | `class-validator` decorators (`@IsString`, `@IsEmail`, ...) combined with `@nodeboot/starter-validation` — see `nodeboot-starter-validation` skill                                                                                                       |
| Lifecycle                | `@Lifecycle(phase)` on an `ApplicationFeatureAdapter` — phases: `application.initialized`, `persistence.started`, `application.started`, `application.stopped`                                                                                           |

Request-parameter decorators share a common `options` object: `required` (throw 400 if missing),
`parse` (JSON-parse a string before injecting), `transform` (apply `class-transformer`).
