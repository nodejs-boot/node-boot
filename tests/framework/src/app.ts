import "reflect-metadata";
import {Container} from "typedi";
import {Body, Controller, Controllers, NodeBoot, NodeBootApp, NodeBootApplication, Post} from "@node-boot/core";
import {ExpressServer} from "@node-boot/express-server";
import {EnableDI} from "@node-boot/di";
import {Exclude, Expose} from "class-transformer";
import {NodeBootAppView} from "@node-boot/core/src/server/NodeBootApp";

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
    start(port?: number): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer, port);
    }
}
