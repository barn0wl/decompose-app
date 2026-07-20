// lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from 'dotenv';
import { PrismaClient } from "@generated/prisma";

dotenv.config();

// Singleton pattern
let prisma: PrismaClient;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ adapter });
} else {
  // In development, use a global variable to prevent multiple instances
  const globalForPrisma = global as unknown as { prisma: PrismaClient };
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  
  prisma = globalForPrisma.prisma;
}

export default prisma;