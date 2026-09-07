import {generateKeyPairSync} from "node:crypto";
import {writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

/**
 * Firebase's `serviceAccount` config is a file path (not an inline object) that
 * `admin.credential.cert()` parses with `node-forge`'s PEM parser - it validates the key is a
 * syntactically well-formed RSA private key, but never contacts Google, so a synthetic,
 * non-Google-issued key pair is sufficient for testing the wiring without real credentials.
 */
function createTestServiceAccountFile(): string {
    const {privateKey} = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: {type: "pkcs8", format: "pem"},
        publicKeyEncoding: {type: "spki", format: "pem"},
    });

    const serviceAccount = {
        project_id: "test-project",
        private_key: privateKey,
        client_email: "test@test-project.iam.gserviceaccount.com",
    };

    const filePath = join(tmpdir(), `nodeboot-firebase-test-service-account-${process.pid}.json`);
    writeFileSync(filePath, JSON.stringify(serviceAccount));
    return filePath;
}

export const testServiceAccountPath = createTestServiceAccountFile();
