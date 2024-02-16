import {BaseServer} from "./BaseServer";

export interface NodeBootApp {
    start(port?: number): Promise<BaseServer>;
}
