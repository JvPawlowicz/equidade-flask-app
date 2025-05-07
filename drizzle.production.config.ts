import type { Config } from "drizzle-kit";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definido");
}

export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
    ssl: true, // Habilitando SSL para conexões seguras em produção
  },
  verbose: false, // Reduzir verbosidade dos logs em produção
  strict: true, // Aplicar validações rígidas
} satisfies Config;