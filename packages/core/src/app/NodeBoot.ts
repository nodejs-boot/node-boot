import { BaseApplication } from "./BaseApplication";

export class NodeBoot {
  static async run<
    TApplicationServer extends new (...args: any[]) => BaseApplication<any, any>
  >(applicationServer: TApplicationServer): Promise<BaseApplication<any, any>> {
    const application = new applicationServer();
    return application.run();
  }
}
