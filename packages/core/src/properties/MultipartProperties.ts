/**
 * Fastify https://github.com/fastify/fastify-multipart
 * Express uses express multer: https://github.com/expressjs/multer#limits
 * Koa uses koa multer: https://github.com/expressjs/multer#limits
 * */
export interface MultipartProperties {
    /**
     * Allow throwing error when file size limit reached.
     * Fastify Only
     */
    throwFileSizeLimit?: boolean;

    limits?: {
        /**
         * Max field name size in bytes
         */
        fieldNameSize?: number;

        /**
         * Max field value size in bytes
         */
        fieldSize?: number;

        /**
         * Max number of non-file fields
         */
        fields?: number;

        /**
         * For multipart forms, the max file size
         */
        fileSize?: number;

        /**
         * Max number of file fields
         */
        files?: number;

        /**
         * Max number of header key=>value pairs
         */
        headerPairs?: number;
    };
}
