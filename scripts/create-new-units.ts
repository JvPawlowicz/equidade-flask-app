import { createNewUnitsAndUsers } from "../db/seed";

async function main() {
  try {
    console.log("Iniciando criação de novas unidades e usuários...");
    const result = await createNewUnitsAndUsers();
    
    if (result) {
      console.log("Novas unidades e usuários criados com sucesso!");
      process.exit(0);
    } else {
      console.error("Erro ao criar novas unidades e usuários");
      process.exit(1);
    }
  } catch (error) {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  }
}

main();