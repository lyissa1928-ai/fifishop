import "dotenv/config";
import * as argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL manquante");
  }

  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME?.trim() || "Super";
  const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim() || "Admin";

  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD sont obligatoires"
    );
  }

  if (password.length < 12) {
    throw new Error(
      "Le mot de passe SUPER_ADMIN doit contenir au moins 12 caractères"
    );
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (existingSuperAdmin) {
      console.log(
        `SUPER_ADMIN déjà présent : ${existingSuperAdmin.email}`
      );
      return;
    }

    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingEmail) {
      throw new Error(
        "Cette adresse email appartient déjà à un autre compte"
      );
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    console.log("SUPER_ADMIN créé avec succès.");
    console.log(admin);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});