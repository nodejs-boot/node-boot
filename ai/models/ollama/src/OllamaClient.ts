export class OllamaClient {
    private readonly baseURL: string;

    constructor(baseURL: string = "http://localhost:11434") {
        this.baseURL = baseURL;
    }

    async chat(params: any): Promise<any> {
        const response = await fetch(`${this.baseURL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({...params, stream: false}),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ollama chat request failed with status ${response.status}: ${text}`);
        }

        return response.json();
    }

    async embed(params: any): Promise<any> {
        const response = await fetch(`${this.baseURL}/api/embed`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({...params}),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ollama embed request failed with status ${response.status}: ${text}`);
        }

        return response.json();
    }
}
