import {nodeBootRun} from "./NodeBootTest";
import {TestApp} from "./app";

nodeBootTest(TestApp,
    ()=>{
        @JsonController('', { transformResponse: false })
        class NoTransformResponseController {
            @Post('/default')
            default(@Body() user: UserModel) {
                return handler(user);
            }

            @Post('/transformRequestOnly', { transformRequest: true, transformResponse: false })
            transformRequestOnly(@Body() user: UserModel) {
                return handler(user);
            }

            @Post('/transformResponseOnly', { transformRequest: false, transformResponse: true })
            transformResponseOnly(@Body() user: UserModel) {
                return handler(user);
            }
        }
    },
    describe(`Test name`, () => {

        xpto(
            "when it works correctly",
            async () => {
                await nodeBootRun(TestApp);
            },
            /* times to run, similar to repeats */ 19,
            /* method to use to accumulate iterations, an enum */ "foo",
        );

        beforeAll(async () => {

        });

        afterAll(() => {

        });

        beforeEach(() => {

        });

        it("test-case 1", async () => {

        });

        it("test-case 2", async () => {

        });

        it("test-case 3", async () => {

        });
    });
    )