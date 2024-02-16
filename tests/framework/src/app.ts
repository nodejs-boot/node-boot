import "reflect-metadata";
import {Container} from "typedi";
import {
    BaseServer,
    Body,
    Controller,
    Controllers,
    NodeBoot,
    NodeBootApp,
    NodeBootApplication,
    Post,
} from "@node-boot/core";
import {ExpressServer} from "@node-boot/express-server";
import {EnableDI} from "@node-boot/di";
import {Exclude, Expose} from "class-transformer";

@Exclude()
class UserModel {
    @Expose()
    firstName: string;

    lastName: string;
}

function handler(user: UserModel) {
    const ret = new UserModel();
    ret.firstName = user.firstName;
    ret.lastName = user.lastName || "default";
    return ret;
}

@Controller("")
class NoTransformResponseController {
    @Post("/default")
    default(@Body() user: UserModel) {
        return handler(user);
    }

    @Post("/noTransform", {transformRequest: false, transformResponse: false})
    noTransform(@Body() user: UserModel) {
        return handler(user);
    }

    @Post("/transformRequestOnly", {transformRequest: true, transformResponse: false})
    transformRequestOnly(@Body() user: UserModel) {
        return handler(user);
    }

    @Post("/transformResponseOnly", {transformRequest: false, transformResponse: true})
    transformResponseOnly(@Body() user: UserModel) {
        return handler(user);
    }
}

@EnableDI(Container)
@NodeBootApplication()
@Controllers([NoTransformResponseController])
export class TestApp implements NodeBootApp {
    start(port?: number): Promise<BaseServer> {
        return new Promise((resolve, reject) => {
            NodeBoot.run(ExpressServer)
                .then(app => {
                    app.listen(port)
                        .then(() => {
                            console.info("Node-Boot application started successfully");
                            resolve(app);
                        })
                        .catch(error => {
                            console.error("Error starting Node-Boot application.", error);
                            reject(error);
                        });
                })
                .catch(error => {
                    console.error("Error starting Node-Boot application.", error);
                    reject(error);
                });
        });
    }
}
