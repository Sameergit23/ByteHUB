export interface InternshipItem {
  id: string;
  title: string;
  companyName: string;
  location: string;
  type: "REMOTE" | "HYBRID" | "ON_SITE";
  stipend: number;
  currency: string;
  durationMonths: number;
  openings: number;
  deadline: string;
  skills: string[];
  description: string;
  requirements: string[];
  perks: string[];
}

export const MOCK_INTERNSHIPS: InternshipItem[] = [
  {
    id: "intern-01",
    title: "Distributed Systems & Storage Intern",
    companyName: "HyperGrid Labs",
    location: "Bengaluru (Hybrid)",
    type: "HYBRID",
    stipend: 45000,
    currency: "INR",
    durationMonths: 6,
    openings: 2,
    deadline: "2026-12-15T23:59:59.000Z",
    skills: ["Rust", "PostgreSQL", "Raft", "Distributed Systems"],
    description:
      "Join our core storage engine team building multi-region partitioned key-value databases with strict ACID transaction guarantees. You will profile memory allocations, debug write-ahead log performance, and write comprehensive chaos testing harnesses.",
    requirements: [
      "Proficient in systems languages (Rust, C++, or Go)",
      "Strong understanding of concurrency primitives and OS internals",
      "Familiarity with network sockets and binary RPC framing",
    ],
    perks: [
      "INR 45,000 / month stipend",
      "Direct mentorship from former L6 distributed systems engineers",
      "Hardware allowance and book budget",
      "High PPO conversion rate",
    ],
  },
  {
    id: "intern-02",
    title: "Full-Stack TypeScript Engineer Intern",
    companyName: "KiteMetrics HQ",
    location: "Remote (India)",
    type: "REMOTE",
    stipend: 38000,
    currency: "INR",
    durationMonths: 4,
    openings: 3,
    deadline: "2026-12-20T23:59:59.000Z",
    skills: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma"],
    description:
      "Design and ship mission-critical operational analytics interfaces using Next.js 14 App Router, strict TypeScript, and Tailwind CSS. You will collaborate directly with design and backend teams to deliver sub-100ms dashboards compliant with WCAG AA.",
    requirements: [
      "Demonstrated experience with React 18 / Next.js and strict TypeScript",
      "Solid comprehension of state management and server component boundaries",
      "Strong aesthetic sensibility and adherence to strict design tokens",
    ],
    perks: [
      "INR 38,000 / month stipend",
      "Flexible working hours across Indian standard time",
      "Latest M-series development machine provided",
    ],
  },
  {
    id: "intern-03",
    title: "Cloud Infrastructure & Platform Intern",
    companyName: "Aether Cloud Infrastructure",
    location: "Hyderabad (On-Site)",
    type: "ON_SITE",
    stipend: 50000,
    currency: "INR",
    durationMonths: 6,
    openings: 1,
    deadline: "2026-12-10T23:59:59.000Z",
    skills: ["Kubernetes", "Terraform", "Docker", "Prometheus", "CI/CD"],
    description:
      "Maintain and automate our bare-metal Kubernetes clusters, implement GitOps pipelines with ArgoCD, and build self-service developer tooling for over 200 microservices.",
    requirements: [
      "Hands-on experience with Linux system administration and shell scripting",
      "Understanding of container runtimes and Kubernetes control plane",
      "Familiarity with declarative IaC (Terraform or OpenTofu)",
    ],
    perks: [
      "INR 50,000 / month stipend",
      "Daily catered meals and commuter shuttle service",
      "Pre-placement offer opportunity based on mid-term review",
    ],
  },
  {
    id: "intern-04",
    title: "Security Engineering & Cryptography Intern",
    companyName: "CipherVault",
    location: "Remote (Global)",
    type: "REMOTE",
    stipend: 55000,
    currency: "INR",
    durationMonths: 5,
    openings: 2,
    deadline: "2026-12-30T23:59:59.000Z",
    skills: ["Python", "Rust", "Zero-Knowledge", "Cryptography", "AppSec"],
    description:
      "Perform static and dynamic security assessments on cryptographic primitives, write fuzzing harnesses, and review multi-tenant payment gateway signatures.",
    requirements: [
      "Background in applied cryptography and public key infrastructure",
      "Experience with fuzzing tools (AFL++, cargo-fuzz) and reverse engineering",
      "Rigorous commitment to defensive coding standards",
    ],
    perks: [
      "INR 55,000 / month stipend",
      "Full conference sponsorship for DefCon or BlackHat",
      "Remote office setup stipend",
    ],
  },
];

export interface TrainingProgramItem {
  id: string;
  slug: string;
  title: string;
  track: string;
  priceINR: number;
  priceUSD: number;
  durationWeeks: number;
  level: string;
  cohortStart: string;
  seatsTotal: number;
  seatsLeft: number;
  summary: string;
  syllabus: {
    week: number;
    title: string;
    description: string;
    deliverables: string[];
  }[];
  outcomes: string[];
  tools: string[];
}

export const MOCK_TRAINING_PROGRAMS: TrainingProgramItem[] = [
  {
    id: "prog-systems-01",
    slug: "systems-and-distributed-computing",
    title: "Systems & Distributed Engineering",
    track: "SYSTEMS",
    priceINR: 12499,
    priceUSD: 149,
    durationWeeks: 10,
    level: "Intermediate to Advanced",
    cohortStart: "2026-12-01",
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
  },
  {
    id: "prog-fullstack-02",
    slug: "production-fullstack-typescript",
    title: "Production Full-Stack Architecture",
    track: "FULL-STACK",
    priceINR: 9999,
    priceUSD: 119,
    durationWeeks: 8,
    level: "Intermediate",
    cohortStart: "2026-12-15",
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
  },
  {
    id: "prog-devops-03",
    slug: "cloud-native-devops-and-k8s",
    title: "Cloud-Native Infrastructure & Kubernetes",
    track: "PLATFORM & CLOUD",
    priceINR: 11499,
    priceUSD: 139,
    durationWeeks: 8,
    level: "Advanced",
    cohortStart: "2027-01-05",
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
  },
];

