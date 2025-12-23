import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = "admin@apostolicgraphix.com";
const newPassword = "Admin@123";

async function main() {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: { id: true, email: true, role: true, updatedAt: true },
  });

  console.log("✅ Password reset:", user);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
