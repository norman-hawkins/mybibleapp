import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.env.CONTRIB_EMAIL || "contrib@apostolicgraphix.com";
const password = process.env.CONTRIB_PASSWORD || "Contrib@123";
const name = process.env.CONTRIB_NAME || "Contributor";

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "CONTRIBUTOR",
      passwordHash,
    },
    create: {
      email,
      name,
      role: "CONTRIBUTOR",
      passwordHash,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  console.log("✅ Contributor user ready:", user);
  console.log("🔑 Login:", email, "/", password);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
