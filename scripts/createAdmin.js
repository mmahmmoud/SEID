import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      password: passwordHash,
      role: "admin"
    }
  });
  console.log("Admin user created! Email: admin@example.com  Password: admin123");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
