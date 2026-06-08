import { mkdirSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./dev.db";

if (url.startsWith("file:")) {
  const filePath = url.replace(/^file:/, "");
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  mkdirSync(path.dirname(absolutePath), { recursive: true });
}
