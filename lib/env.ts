import fs from "fs";
import path from "path";

export function loadEnv() {
  try {
    // Try .env.local first, then .env
    let envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) {
      envPath = path.join(process.cwd(), ".env");
    }

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        // Skip comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith("#")) return;

        const eqIdx = trimmedLine.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmedLine.substring(0, eqIdx).trim();
          let val = trimmedLine.substring(eqIdx + 1).trim();

          // Remove surrounding quotes if any
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.substring(1, val.length - 1);
          }

          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (e) {
    console.error("Failed to load local environment file:", e);
  }
}
