export class DependenciesLoader {
    /**
     * Dynamically loads @fastify/session module.
     */
    static loadSession() {
        try {
            return require("@fastify/session");
        } catch (e) {
            throw new Error(
                "@fastify/session package was not found installed. Try to install it: npm install @fastify/session --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/cookie module.
     */
    static loadCookie() {
        try {
            return require("@fastify/cookie");
        } catch (e) {
            throw new Error(
                "@fastify/cookie package was not found installed. Try to install it: npm install @fastify/cookie --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/multipart module.
     */
    static loadMultipart() {
        try {
            return require("@fastify/multipart");
        } catch (e) {
            throw new Error(
                "@fastify/multipart package was not found installed. Try to install it: npm install @fastify/multipart --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/cors module.
     */
    static loadCors() {
        try {
            return require("@fastify/cors");
        } catch (e) {
            throw new Error(
                "@fastify/cors package was not found installed. Try to install it: npm install @fastify/cors --save",
            );
        }
    }

    /**
     * Dynamically loads @fastify/view module.
     */
    static loadView() {
        try {
            return require("@fastify/view");
        } catch (e) {
            throw new Error(
                "@fastify/view package was not found installed. Try to install it: npm install @fastify/view --save",
            );
        }
    }
}
