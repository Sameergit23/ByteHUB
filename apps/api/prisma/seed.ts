import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[ByteHUB Prisma Seed] Seeding platform data...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("Password123!", salt);

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@bytehub.io" },
    update: {},
    create: {
      email: "admin@bytehub.io",
      passwordHash,
      name: "Saim Ansari (Staff Admin)",
      role: "ADMIN",
    },
  });
  console.log(`[Seed] Admin created: ${admin.email}`);

  // 2. Company User & Profile
  const companyUser = await prisma.user.upsert({
    where: { email: "recruiting@hypergrid.io" },
    update: {},
    create: {
      email: "recruiting@hypergrid.io",
      passwordHash,
      name: "HyperGrid Systems Inc.",
      role: "COMPANY",
      organizationName: "HyperGrid Systems",
      companyProfile: {
        create: {
          website: "https://hypergrid.io",
          industry: "Distributed Database Infrastructure",
          description: "High-performance partitioned key-value databases with strict ACID guarantees.",
          verified: true,
        },
      },
    },
  });
  console.log(`[Seed] Company created: ${companyUser.email}`);

  // 3. Student User & Profile
  const student = await prisma.user.upsert({
    where: { email: "student@bytehub.io" },
    update: {},
    create: {
      email: "student@bytehub.io",
      passwordHash,
      name: "Maya Sen",
      role: "STUDENT",
      studentProfile: {
        create: {
          college: "Indian Institute of Technology",
          graduationYear: 2026,
          degree: "B.Tech Computer Science",
          githubUrl: "https://github.com/mayasen",
          linkedinUrl: "https://linkedin.com/in/mayasen",
        },
      },
    },
  });
  console.log(`[Seed] Student created: ${student.email}`);

  // 4. Sample Internship
  const internship = await prisma.internship.upsert({
    where: { id: "intern-01" },
    update: {},
    create: {
      id: "intern-01",
      companyId: companyUser.id,
      title: "Distributed Systems & Storage Intern",
      companyName: "HyperGrid Labs",
      location: "Bengaluru (Hybrid)",
      type: "HYBRID",
      stipend: 45000,
      currency: "INR",
      durationMonths: 6,
      openings: 2,
      deadline: new Date("2026-12-15T23:59:59.000Z"),
      skills: ["Rust", "PostgreSQL", "Raft", "Distributed Systems"],
      description:
        "Join our core storage engine team building multi-region partitioned key-value databases with strict ACID transaction guarantees.",
      requirements: [
        "Proficient in systems languages (Rust, C++, or Go)",
        "Strong understanding of concurrency primitives and OS internals",
        "Familiarity with network sockets and binary RPC framing",
      ],
      perks: [
        "INR 45,000 / month stipend",
        "Direct mentorship from former L6 distributed systems engineers",
        "Hardware allowance and book budget",
      ],
      status: "PUBLISHED",
    },
  });
  console.log(`[Seed] Internship created: ${internship.title}`);

  // 5. Training Programs
  const program = await prisma.trainingProgram.upsert({
    where: { slug: "systems-and-distributed-computing" },
    update: {},
    create: {
      id: "prog-systems-01",
      slug: "systems-and-distributed-computing",
      title: "Systems & Distributed Engineering",
      track: "SYSTEMS_ENGINEERING",
      priceINR: 12499,
      priceUSD: 149,
      durationWeeks: 10,
      level: "INTERMEDIATE",
      cohortStart: new Date("2026-12-01T00:00:00.000Z"),
      seatsTotal: 40,
      seatsLeft: 12,
      summary:
        "A rigorous, engineering-first laboratory mastering low-latency primitives, concurrency models, consensus mechanisms (Raft), and distributed storage internals.",
      syllabus: [
        {
          week: 1,
          title: "OS Primitives & Memory Layout",
          description: "Memory models, pointer arithmetic, system calls, virtual memory.",
          deliverables: ["Custom malloc implementation"],
        },
        {
          week: 2,
          title: "Network Programming & Wire Protocols",
          description: "TCP handshake, socket programming, binary serialization.",
          deliverables: ["Binary RPC serialization parser"],
        },
      ],
      outcomes: [
        "Architect resilient distributed micro-clusters",
        "Master ACID transaction mechanics and lock contention",
      ],
      tools: ["Rust", "C++", "Go", "Docker", "Wireshark"],
      published: true,
    },
  });
  console.log(`[Seed] Training program created: ${program.title}`);

  console.log("[ByteHUB Prisma Seed] Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

