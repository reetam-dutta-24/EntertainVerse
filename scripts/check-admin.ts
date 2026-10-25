import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: "admin@entertainverse.local" },
    select: {
      email: true,
      handle: true,
      role: true,
      passwordHash: true,
    },
  });

  console.log(
    "admin user:",
    u
      ? {
          email: u.email,
          handle: u.handle,
          role: u.role,
          hasHash: Boolean(u.passwordHash),
        }
      : "NOT FOUND",
  );

  if (u?.passwordHash) {
    console.log(
      "Admin123! matches:",
      await bcrypt.compare("Admin123!", u.passwordHash),
    );
  }

  const count = await prisma.user.count();
  console.log("total users:", count);
}

main()
  .finally(() => prisma.$disconnect());
