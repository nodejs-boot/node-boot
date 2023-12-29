import Koa from "koa";
import Router from "@koa/router";

export class DependenciesLoader {
    /**
     * Dynamically loads koa module.
     */
    static loadKoa(): Koa {
        if (require) {
            try {
                return new (require("koa"))();
            } catch (e) {
                throw new Error("koa package was not found installed. Try to install it: npm install koa@next --save");
            }
        } else {
            throw new Error("Cannot load koa. Try to install all required dependencies.");
        }
    }

    /**
     * Dynamically loads @koa/router module.
     */
    static loadRouter(): Router {
        if (require) {
            try {
                return new (require("@koa/router"))();
            } catch (e) {
                throw new Error("@koa/router package was not found installed. Try to install it: npm install @koa/router --save");
            }
        } else {
            throw new Error("Cannot load koa. Try to install all required dependencies.");
        }
    }

    /**
     * Dynamically loads multer and @koa/multer module.
     */
    static loadMulter() {
        try {
            require("multer");
        } catch (e) {
            throw new Error("multer package was not found installed. Try to install it: npm install multer --save");
        }

        try {
            return require("@koa/multer");
        } catch (e) {
            throw new Error("@koa/multer package was not found installed. Try to install it: npm install @koa/multer --save");
        }
    }

    /**
     * Dynamically loads @koa/cors module.
     */
    static loadCors() {
        try {
            return require("@koa/cors");
        } catch (e) {
            throw new Error("@koa/cors package was not found installed. Try to install it: npm install @koa/cors --save");
        }
    }

    /**
     * Dynamically loads koa-session module.
     */
    static loadSession() {
        try {
            return require("koa-session");
        } catch (e) {
            throw new Error("koa-session package was not found installed. Try to install it: npm install koa-session --save");
        }
    }
}
