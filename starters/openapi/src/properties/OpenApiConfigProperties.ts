import {
    ExternalDocumentationObject,
    InfoObject,
    ReferenceObject,
    SecurityRequirementObject,
    SecuritySchemeObject,
    ServerObject,
    TagObject,
} from "openapi3-ts";

export type OpenApiConfigProperties = {
    info: InfoObject;
    servers?: ServerObject[];
    security?: SecurityRequirementObject[];
    tags?: TagObject[];
    externalDocs?: ExternalDocumentationObject;
    securitySchemes?: {[securityScheme: string]: SecuritySchemeObject | ReferenceObject};
};
