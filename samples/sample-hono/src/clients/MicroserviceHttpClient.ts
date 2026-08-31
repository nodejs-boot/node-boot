import {HttpClient, HttpClientStub} from "@nodeboot/starter-http";

@HttpClient({
    baseURL: "https://jsonplaceholder.typicode.com",
    timeout: 5000,
    httpLogging: true,
})
export class MicroserviceHttpClient extends HttpClientStub {}
