import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      passwordHash,
    },
    create: {
      email,
      role: "ADMIN",
      passwordHash,
      name: "Admin",
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  console.log("✅ Admin user ready:", user);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
