import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const trainingRouter = Router();

export const DEFAULT_PROGRAMS = [
  {
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
        description: "Memory models, pointer arithmetic, system calls, virtual memory, cache lines.",
        deliverables: ["Custom malloc implementation", "POSIX thread pool benchmark"],
      },
      {
        week: 2,
        title: "Network Programming & Wire Protocols",
        description: "TCP handshake, socket programming, binary serialization, custom RPC frames.",
        deliverables: ["Binary RPC serialization parser"],
      },
      {
        week: 3,
        title: "Log-Structured Storage & LSM Trees",
        description: "Write-ahead logging (WAL), memtable design, SSTable compaction, Bloom filters.",
        deliverables: ["Single-node KV engine with WAL crash recovery"],
      },
      {
        week: 4,
        title: "Distributed Consensus (Raft)",
        description: "Leader election, log replication, safety invariants, network partition handling.",
        deliverables: ["3-node replicated state machine passing fault injection suite"],
      },
    ],
    outcomes: [
      "Architect resilient distributed micro-clusters",
      "Benchmark throughput and p99 tail latency under load",
      "Master ACID transaction mechanics and lock contention",
    ],
    tools: ["Rust", "C++", "Go", "Docker", "Wireshark", "Prometheus"],
    published: true,
  },
  {
    id: "prog-fullstack-02",
    slug: "production-fullstack-typescript",
    title: "Production Full-Stack Architecture",
    track: "FULL_STACK",
    priceINR: 9999,
    priceUSD: 119,
    durationWeeks: 8,
    level: "INTERMEDIATE",
    cohortStart: new Date("2026-12-15T00:00:00.000Z"),
    seatsTotal: 50,
    seatsLeft: 18,
    summary:
      "Build industrial-grade web platforms with Next.js App Router, strict TypeScript, ACID transactional integrity, queue processing, and WCAG AA accessibility standards.",
    syllabus: [
      {
        week: 1,
        title: "Strict Type Systems & Contract-Driven Design",
        description: "End-to-end type safety, Zod runtime validation, OpenAPI schemas, and monorepos.",
        deliverables: ["Shared contract workspace with automated schema regression checks"],
      },
      {
        week: 2,
        title: "Relational Modeling & Transaction Isolation",
        description: "PostgreSQL indexing, query plans, deadlocks, Prisma transactions, idempotency.",
        deliverables: ["Double-entry financial ledger passing concurrent checkout tests"],
      },
      {
        week: 3,
        title: "Next.js App Router, SSR & Streaming",
        description: "Server Components, Suspense boundaries, caching strategies, and optimistic UI.",
        deliverables: ["High-speed editorial platform with < 100ms TTFB"],
      },
      {
        week: 4,
        title: "Payment Systems & Webhook Verification",
        description: "Razorpay/Stripe integrations, signature verification, retry idempotency queues.",
        deliverables: ["Production-ready multi-gateway billing engine"],
      },
    ],
    outcomes: [
      "Ship high-throughput enterprise TypeScript architectures",
      "Implement compliant, secure billing workflows",
      "Pass strict WCAG accessibility and performance audits",
    ],
    tools: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL", "Redis"],
    published: true,
  },
  {
    id: "prog-devops-03",
    slug: "cloud-native-devops-and-k8s",
    title: "Cloud-Native Infrastructure & Kubernetes",
    track: "DEVOPS_CLOUD",
    priceINR: 11499,
    priceUSD: 139,
    durationWeeks: 8,
    level: "ADVANCED",
    cohortStart: new Date("2027-01-05T00:00:00.000Z"),
    seatsTotal: 35,
    seatsLeft: 9,
    summary:
      "Zero-downtime deployments, Kubernetes operator patterns, multi-region CI/CD pipelines, Terraform IaC, and observability engineering.",
    syllabus: [
      {
        week: 1,
        title: "Immutable Infrastructure with Terraform",
        description: "VPC topology, security groups, state locking, and modular cloud architectures.",
        deliverables: ["Terraform blueprint deploying an audited VPC with bastion access"],
      },
      {
        week: 2,
        title: "Kubernetes Core & Controller Internals",
        description: "Pod lifecycle, Service topologies, Ingress controllers, and persistent volumes.",
        deliverables: ["High-availability deployment with PodDisruptionBudgets and HPA"],
      },
    ],
    outcomes: [
      "Provision production infrastructure with code",
      "Deploy self-healing container topologies",
      "Implement comprehensive Grafana/Prometheus alerting",
    ],
    tools: ["Kubernetes", "Docker", "Terraform", "GitHub Actions", "Grafana", "AWS"],
    published: true,
  },
];

trainingRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const programs = await prisma.trainingProgram.findMany({
      where: { published: true },
      orderBy: { createdAt: "asc" },
    });

    if (programs.length > 0) {
      res.status(200).json({ status: "success", data: programs });
      return;
    }
  } catch {
    // Fallback to static seed data
  }

  res.status(200).json({ status: "success", data: DEFAULT_PROGRAMS });
});

trainingRouter.get("/:slugOrId", async (req: Request, res: Response): Promise<void> => {
  const { slugOrId } = req.params;

  try {
    const program = await prisma.trainingProgram.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
    });

    if (program) {
      res.status(200).json({ status: "success", data: program });
      return;
    }
  } catch {
    // Fallback
  }

  const fallback = DEFAULT_PROGRAMS.find(
    (p) => p.id === slugOrId || p.slug === slugOrId
  );

  if (!fallback) {
    res.status(404).json({
      status: "fail",
      code: "NOT_FOUND",
      message: "Training program not found",
    });
    return;
  }

  res.status(200).json({ status: "success", data: fallback });
});
