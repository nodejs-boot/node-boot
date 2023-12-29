import {Application} from "express";

export class DependenciesLoader {
    /**
     * Dynamically loads express module.
     */
    static loadExpress(): Application {
        if (require) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                return require("express")();
            } catch (e) {
                throw new Error("express package was not found installed. Try to install it: npm install express --save");
            }
        } else {
            throw new Error("Cannot load express. Try to install all required dependencies.");
        }
    }

    /**
     * Dynamically loads body-parser module.
     */
    static loadBodyParser() {
        try {
            return require("body-parser");
        } catch (e) {
            throw new Error("body-parser package was not found installed. Try to install it: npm install body-parser --save");
        }
    }

    /**
     * Dynamically loads multer module.
     */
    static loadMulter() {
        try {
            return require("multer");
        } catch (e) {
            throw new Error("multer package was not found installed. Try to install it: npm install multer --save");
        }
    }
}
