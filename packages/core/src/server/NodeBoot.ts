import { BaseServer } from "./BaseServer";

export class NodeBoot {
  static async run<
    TApplicationServer extends new (...args: any[]) => BaseServer<any, any>
  >(applicationServer: TApplicationServer): Promise<BaseServer<any, any>> {
    const application = new applicationServer();
    return application.run();
  }
}
