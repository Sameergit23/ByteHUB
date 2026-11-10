import { Router } from "express";
import { TrainingController } from "../controllers/training.controller.js";
import { authenticateJWT } from "../middleware/auth.js";

export const trainingRouter: Router = Router();

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
        description:
          "Memory models, pointer arithmetic, system calls, virtual memory, cache lines.",
        deliverables: ["Custom malloc implementation", "POSIX thread pool benchmark"],
      },
      {
        week: 2,
        title: "Network Programming & Wire Protocols",
        description:
          "TCP handshake, socket programming, binary serialization, custom RPC frames.",
        deliverables: ["Binary RPC serialization parser"],
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
];

trainingRouter.get("/", TrainingController.list);

// Signed-in student: own enrolments with programme, progress and certificate
trainingRouter.get("/my/enrollments", authenticateJWT, TrainingController.myEnrollments);

// Public: one cohort with its programme (used by the checkout page)
trainingRouter.get("/cohorts/:cohortId", TrainingController.getCohort);

trainingRouter.get("/:slugOrId", TrainingController.getBySlugOrId);
