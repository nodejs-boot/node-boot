// 🧠 Inject Swagger spec URL and UI config into index.html
export function generateSwaggerUiHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="/api-docs/swagger-ui.css" />
    <link rel="icon" type="image/png" href="/api-docs/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="/api-docs/favicon-16x16.png" sizes="16x16" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #fafafa;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api-docs/swagger-ui-bundle.js"></script>
    <script src="/api-docs/swagger-ui-standalone-preset.js"></script>
    <script src="/api-docs/swagger-config.js"></script>
  </body>
</html>`;
}

// 🧩 MIME type helper
export function getContentType(file: string): string {
    if (file.endsWith(".js")) return "application/javascript";
    if (file.endsWith(".css")) return "text/css";
    if (file.endsWith(".html")) return "text/html";
    if (file.endsWith(".json")) return "application/json";
    if (file.endsWith(".png")) return "image/png";
    if (file.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
}

export function generateSwaggerJsConfig(url: string): string {
    return `
window.onload = () => {
  window.ui = SwaggerUIBundle({
    url: "${url}",
    dom_id: "#swagger-ui",
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: "StandaloneLayout"
  });
};`;
}
