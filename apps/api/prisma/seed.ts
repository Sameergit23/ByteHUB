import { PrismaClient, Role, InternshipType, InternshipStatus, ApplicationStatus, PaymentProvider, PaymentStatus, EnrollmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("[ByteHUB Prisma Seed] Starting database seeding...");

  // 1. Password hash for test accounts
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("Password123!", salt);

  // 2. Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@bytehub.io" },
    update: {},
    create: {
      email: "admin@bytehub.io",
      passwordHash,
      name: "[ADMIN NAME]",
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });
  console.log(`[Seed] Admin created: ${admin.email}`);

  // 3. Company Users & Company Profiles
  const companyUser1 = await prisma.user.upsert({
    where: { email: "recruiting@hypergrid.io" },
    update: {},
    create: {
      email: "recruiting@hypergrid.io",
      passwordHash,
      name: "[COMPANY REP]",
      role: Role.COMPANY,
      isEmailVerified: true,
      organizationName: "HyperGrid Systems",
      companyProfile: {
        create: {
          companyName: "HyperGrid Systems",
          website: "https://hypergrid.io",
          industry: "Distributed Systems & Cloud",
          description: "High-performance partitioned key-value infrastructure with strict ACID guarantees.",
          verified: true,
        },
      },
    },
  });

  const companyUser2 = await prisma.user.upsert({
    where: { email: "talent@acme.com" },
    update: {},
    create: {
      email: "talent@acme.com",
      passwordHash,
      name: "[COMPANY REP]",
      role: Role.COMPANY,
      isEmailVerified: true,
      organizationName: "Acme Technology Labs",
      companyProfile: {
        create: {
          companyName: "Acme Technology Labs",
          website: "https://acme.com",
          industry: "Full-Stack Web & Mobile",
          description: "Product studio building consumer and enterprise applications across platforms.",
          verified: true,
        },
      },
    },
  });
  console.log(`[Seed] Companies created: ${companyUser1.email}, ${companyUser2.email}`);

  // 4. Student User & Profile
  const student = await prisma.user.upsert({
    where: { email: "student@bytehub.io" },
    update: {},
    create: {
      email: "student@bytehub.io",
      passwordHash,
      name: "Maya Sen",
      role: Role.STUDENT,
      isEmailVerified: true,
      studentProfile: {
        create: {
          phone: "+91 9876543210",
          college: "Indian Institute of Technology",
          graduationYear: 2026,
          degree: "B.Tech Computer Science & Engineering",
          bioSummary: "Passionate full-stack developer experienced in TypeScript, React, Node.js, and PostgreSQL.",
          resumeUrl: "https://drive.google.com/file/d/sample-resume",
          githubUrl: "https://github.com/mayasen",
          linkedinUrl: "https://linkedin.com/in/mayasen",
          portfolioUrl: "https://mayasen.dev",
        },
      },
    },
  });
  console.log(`[Seed] Student created: ${student.email}`);

  // 5. Four Tracks (Matching Design Images)
  const tracksData = [
    {
      slug: "web-development",
      name: "01 Web Development",
      description: "HTML to full-stack, built on real projects.",
      displayOrder: 1,
    },
    {
      slug: "app-development",
      name: "02 App Development",
      description: "Ship a mobile app from idea to store.",
      displayOrder: 2,
    },
    {
      slug: "data-and-ai",
      name: "03 Data & AI",
      description: "Python, analytics and applied machine learning.",
      displayOrder: 3,
    },
    {
      slug: "ui-ux-design",
      name: "04 UI/UX Design",
      description: "Research, wireframes and polished interfaces.",
      displayOrder: 4,
    },
  ];

  const createdTracks: Record<string, any> = {};
  for (const t of tracksData) {
    const trk = await prisma.track.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
    createdTracks[t.slug] = trk;
  }
  console.log(`[Seed] 4 Tracks seeded.`);

  // 6. Programmes & Cohorts (Matching Training Image 5)
  const programmesData = [
    {
      slug: "full-stack-web-development",
      trackSlug: "web-development",
      title: "Full-Stack Web Development",
      summary: "HTML to full-stack, built on real projects.",
      description: "Master modern web engineering: Next.js App Router, strict TypeScript, Tailwind CSS, PostgreSQL, and transactional payment systems.",
      syllabus: [
        { week: 1, title: "Modern HTML & Semantic Layouts", description: "Semantic markup, WCAG accessibility, and responsive grids." },
        { week: 2, title: "TypeScript & React Architecture", description: "Strict typing, component boundaries, and state management." },
        { week: 3, title: "Next.js App Router & Server Components", description: "SSR, streaming, API route handlers, and caching." },
        { week: 4, title: "Database Integration & Full Deployment", description: "PostgreSQL, Prisma, authentication, and cloud deployment." },
      ],
      prerequisites: ["Basic computer literacy", "Commitment to 10-15 hours of weekly laboratory work"],
      cohort: {
        cohortCode: "WEB-2026-COHORT-01",
        name: "Cohort 01 — Full-Stack Web",
        mode: "[REMOTE / ON-SITE]",
        startDate: new Date("2026-12-01T00:00:00.000Z"),
        endDate: new Date("2027-02-28T00:00:00.000Z"),
        durationWeeks: 12,
        seatsTotal: 30,
        seatsLeft: 8,
        priceAmount: 2400000, // 24,000 INR in paise (no floats)
        currency: "INR",
      },
    },
    {
      slug: "mobile-app-development",
      trackSlug: "app-development",
      title: "Mobile App Development",
      summary: "Ship a mobile app from idea to store.",
      description: "Build cross-platform applications with React Native, local persistence, native sensors, and store packaging.",
      syllabus: [
        { week: 1, title: "Mobile UI Layout & Flexbox", description: "Native components, gestures, and responsive view layouts." },
        { week: 2, title: "Navigation & Device Sensors", description: "Stack navigators, camera, location, and storage." },
        { week: 3, title: "App Store Packaging & Release", description: "Build variants, code signing, and beta testing distribution." },
      ],
      prerequisites: ["Familiarity with JavaScript or TypeScript fundamentals"],
      cohort: {
        cohortCode: "APP-2026-COHORT-01",
        name: "Cohort 01 — Mobile Apps",
        mode: "[REMOTE / ON-SITE]",
        startDate: new Date("2026-12-01T00:00:00.000Z"),
        endDate: new Date("2027-02-28T00:00:00.000Z"),
        durationWeeks: 12,
        seatsTotal: 25,
        seatsLeft: 5,
        priceAmount: 2400000,
        currency: "INR",
      },
    },
    {
      slug: "data-analytics-with-python",
      trackSlug: "data-and-ai",
      title: "Data Analytics with Python",
      summary: "Python, analytics and applied machine learning.",
      description: "Clean, transform, and visualize large datasets using Python, pandas, SQL, and interactive dashboards.",
      syllabus: [
        { week: 1, title: "Python Fundamentals & Data Structures", description: "Data structures, lambdas, and vectorized operations." },
        { week: 2, title: "SQL & Relational Aggregations", description: "Window functions, CTEs, and execution plan optimization." },
        { week: 3, title: "Exploratory Data Analysis", description: "Visualizing correlations, distributions, and summary statistics." },
      ],
      prerequisites: ["Basic algebra and high-school mathematics"],
      cohort: {
        cohortCode: "DATA-2026-COHORT-01",
        name: "Cohort 01 — Data Analytics",
        mode: "[REMOTE / ON-SITE]",
        startDate: new Date("2026-12-01T00:00:00.000Z"),
        endDate: new Date("2027-02-01T00:00:00.000Z"),
        durationWeeks: 8,
        seatsTotal: 30,
        seatsLeft: 12,
        priceAmount: 1800000,
        currency: "INR",
      },
    },
    {
      slug: "applied-machine-learning",
      trackSlug: "data-and-ai",
      title: "Applied Machine Learning",
      summary: "Applied machine learning workflows and production models.",
      description: "Train, evaluate, and serve predictive models using scikit-learn, PyTorch, and containerized REST endpoints.",
      syllabus: [
        { week: 1, title: "Supervised Learning Fundamentals", description: "Regression, classification, and validation splits." },
        { week: 2, title: "Neural Networks & Feature Engineering", description: "Deep representations, embeddings, and loss surfaces." },
        { week: 3, title: "Model Serving & Monitoring", description: "FastAPI endpoints, latency profiling, and drift monitoring." },
      ],
      prerequisites: ["Working knowledge of Python and linear algebra"],
      cohort: {
        cohortCode: "ML-2026-COHORT-01",
        name: "Cohort 01 — Applied ML",
        mode: "[REMOTE / ON-SITE]",
        startDate: new Date("2026-12-15T00:00:00.000Z"),
        endDate: new Date("2027-03-15T00:00:00.000Z"),
        durationWeeks: 12,
        seatsTotal: 25,
        seatsLeft: 6,
        priceAmount: 2800000,
        currency: "INR",
      },
    },
    {
      slug: "ui-ux-design",
      trackSlug: "ui-ux-design",
      title: "UI/UX Design",
      summary: "Research, wireframes and polished interfaces.",
      description: "From user research to design systems: Figma components, wireframing, high-fidelity prototypes, and usability testing.",
      syllabus: [
        { week: 1, title: "Design Systems & Token Architecture", description: "Color contrast, typography scales, and auto-layout." },
        { week: 2, title: "User Flows & Interactive Prototyping", description: "Figma variables, component states, and micro-interactions." },
        { week: 3, title: "Usability Testing & Design Handoff", description: "User interviews, test analysis, and developer documentation." },
      ],
      prerequisites: ["No coding required; laptop with modern browser"],
      cohort: {
        cohortCode: "DES-2026-COHORT-01",
        name: "Cohort 01 — UI/UX Design",
        mode: "[REMOTE / ON-SITE]",
        startDate: new Date("2026-12-01T00:00:00.000Z"),
        endDate: new Date("2027-02-01T00:00:00.000Z"),
        durationWeeks: 8,
        seatsTotal: 20,
        seatsLeft: 4,
        priceAmount: 1800000,
        currency: "INR",
      },
    },
    {
      slug: "backend-with-nodejs",
      trackSlug: "web-development",
      title: "Backend with Node.js",
      summary: "Scalable APIs, authentication, and database transactions.",
      description: "Build robust backend microservices with Express, PostgreSQL, Prisma, Redis caching, and dual payment webhooks.",
      syllabus: [
        { week: 1, title: "HTTP Architecture & Express", description: "Layered routing, middleware pipelines, and structured logging." },
        { week: 2, title: "PostgreSQL & ACID Transactions", description: "Prisma schema design, indexes, and concurrency isolation." },
        { week: 3, title: "Payment Gateways & Idempotency", description: "Stripe and Razorpay webhooks with cryptographic verification." },
      ],
      prerequisites: ["Basic knowledge of JavaScript or TypeScript"],
      cohort: {
        cohortCode: "NODE-2026-COHORT-01",
        name: "Cohort 01 — Backend Node",
        mode: "[REMOTE / ON-SITE]",
        startDate: new Date("2026-12-01T00:00:00.000Z"),
        endDate: new Date("2027-02-28T00:00:00.000Z"),
        durationWeeks: 10,
        seatsTotal: 30,
        seatsLeft: 9,
        priceAmount: 2200000,
        currency: "INR",
      },
    },
  ];

  let sampleCohortForEnrollment: any = null;

  for (const p of programmesData) {
    const track = createdTracks[p.trackSlug];
    const prog = await prisma.programme.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        trackId: track.id,
        title: p.title,
        summary: p.summary,
        description: p.description,
        syllabus: p.syllabus,
        prerequisites: p.prerequisites,
        published: true,
      },
    });

    const cohort = await prisma.cohort.upsert({
      where: { cohortCode: p.cohort.cohortCode },
      update: {},
      create: {
        ...p.cohort,
        programmeId: prog.id,
      },
    });

    if (!sampleCohortForEnrollment) {
      sampleCohortForEnrollment = cohort;
    }
  }
  console.log(`[Seed] 6 Programmes & Cohorts seeded.`);

  // 7. Five Internships (Matching Image 3 & Image 4)
  const internshipsData = [
    {
      slug: "frontend-developer-intern",
      trackSlug: "web-development",
      companyId: companyUser1.id,
      companyName: "[COMPANY NAME]",
      title: "Frontend Developer Intern",
      location: "[LOCATION]",
      type: InternshipType.REMOTE,
      stipendAmount: 3500000, // 35,000 INR in paise
      currency: "INR",
      durationMonths: 6,
      description: "[Two or three lines describing the project and team.]",
      whatYouWillDo: [
        "Build interface components from designs",
        "Fix bugs and review code with a mentor",
        "Present your work in weekly demos",
      ],
      requirements: [
        "Basic HTML, CSS and JavaScript",
        "[Any programme prerequisite]",
      ],
      skills: ["React", "TypeScript", "Tailwind CSS"],
      openings: 2,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      status: InternshipStatus.PUBLISHED,
    },
    {
      slug: "mobile-app-intern",
      trackSlug: "app-development",
      companyId: companyUser2.id,
      companyName: "[COMPANY NAME]",
      title: "Mobile App Intern",
      location: "[LOCATION]",
      type: InternshipType.REMOTE,
      stipendAmount: 3500000,
      currency: "INR",
      durationMonths: 6,
      description: "[Two or three lines describing the project and team.]",
      whatYouWillDo: [
        "Implement responsive screen layouts using React Native components",
        "Integrate client-side local cache with asynchronous backend endpoints",
        "Debug device-specific layout quirks on iOS and Android test devices",
      ],
      requirements: [
        "Familiarity with mobile interface layout principles",
        "Basic understanding of asynchronous state handling",
      ],
      skills: ["React Native", "Flutter", "TypeScript"],
      openings: 2,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      status: InternshipStatus.PUBLISHED,
    },
    {
      slug: "data-analyst-intern",
      trackSlug: "data-and-ai",
      companyId: companyUser1.id,
      companyName: "[COMPANY NAME]",
      title: "Data Analyst Intern",
      location: "[LOCATION]",
      type: InternshipType.HYBRID,
      stipendAmount: 3500000,
      currency: "INR",
      durationMonths: 6,
      description: "[Two or three lines describing the project and team.]",
      whatYouWillDo: [
        "Clean, transform, and aggregate operational event logs",
        "Build visual dashboards and KPI reports",
        "Perform exploratory data analysis with mentors",
      ],
      requirements: [
        "Basic Python programming (pandas, numpy)",
        "Working knowledge of SQL queries and joins",
      ],
      skills: ["Python", "SQL", "Pandas", "Tableau"],
      openings: 3,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      status: InternshipStatus.PUBLISHED,
    },
    {
      slug: "ui-ux-design-intern",
      trackSlug: "ui-ux-design",
      companyId: companyUser2.id,
      companyName: "[COMPANY NAME]",
      title: "UI/UX Design Intern",
      location: "[LOCATION]",
      type: InternshipType.REMOTE,
      stipendAmount: 3000000,
      currency: "INR",
      durationMonths: 3,
      description: "[Two or three lines describing the project and team.]",
      whatYouWillDo: [
        "Create low-fidelity wireframes and user flow diagrams",
        "Design high-fidelity UI components following design tokens",
        "Participate in usability interviews with students and employers",
      ],
      requirements: [
        "Proficiency with Figma components and auto-layout",
        "Understanding of typographic scale and visual hierarchy",
      ],
      skills: ["Figma", "Design Systems", "Prototyping"],
      openings: 1,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      status: InternshipStatus.PUBLISHED,
    },
    {
      slug: "backend-developer-intern",
      trackSlug: "web-development",
      companyId: companyUser1.id,
      companyName: "[COMPANY NAME]",
      title: "Backend Developer Intern",
      location: "[LOCATION]",
      type: InternshipType.REMOTE,
      stipendAmount: 4000000,
      currency: "INR",
      durationMonths: 6,
      description: "[Two or three lines describing the project and team.]",
      whatYouWillDo: [
        "Design and document RESTful endpoints using OpenAPI / Zod",
        "Write unit and integration tests using Vitest or Jest",
        "Inspect relational database schema queries and indexes",
      ],
      requirements: [
        "Basic understanding of Node.js and HTTP status codes",
        "Familiarity with PostgreSQL or relational databases",
      ],
      skills: ["Node.js", "Express", "TypeScript", "PostgreSQL"],
      openings: 2,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      status: InternshipStatus.PUBLISHED,
    },
  ];

  let sampleInternshipForApp: any = null;

  for (const item of internshipsData) {
    const track = createdTracks[item.trackSlug];
    const intern = await prisma.internship.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        slug: item.slug,
        companyId: item.companyId,
        companyName: item.companyName,
        trackId: track ? track.id : null,
        title: item.title,
        location: item.location,
        type: item.type,
        stipendAmount: item.stipendAmount,
        currency: item.currency,
        durationMonths: item.durationMonths,
        description: item.description,
        whatYouWillDo: item.whatYouWillDo,
        requirements: item.requirements,
        skills: item.skills,
        openings: item.openings,
        deadline: item.deadline,
        status: item.status,
      },
    });

    if (!sampleInternshipForApp) {
      sampleInternshipForApp = intern;
    }
  }
  console.log(`[Seed] 5 Internships seeded.`);

  // 8. Sample Student Application (testing unique constraint studentId + internshipId)
  if (sampleInternshipForApp) {
    await prisma.application.upsert({
      where: {
        studentId_internshipId: {
          studentId: student.id,
          internshipId: sampleInternshipForApp.id,
        },
      },
      update: {},
      create: {
        internshipId: sampleInternshipForApp.id,
        studentId: student.id,
        fullName: "Maya Sen",
        email: "student@bytehub.io",
        phone: "+91 9876543210",
        collegeOrUniversity: "Indian Institute of Technology",
        graduationYear: 2026,
        degree: "B.Tech Computer Science & Engineering",
        githubUrl: "https://github.com/mayasen",
        linkedinUrl: "https://linkedin.com/in/mayasen",
        portfolioUrl: "https://mayasen.dev",
        resumeUrl: "https://drive.google.com/file/d/sample-resume",
        bioSummary: "Passionate full-stack developer experienced in TypeScript, React, Node.js, and PostgreSQL.",
        whyInterested: "ByteHUB's platform engineering programme aligns with my ambition to ship production distributed systems with strict ACID guarantees.",
        relevantProjectDescription: "Engineered an event-driven queue with write-ahead logging and PostgreSQL transactional isolation.",
        availableHoursPerWeek: 30,
        earliestStartDate: new Date("2026-12-01T00:00:00.000Z"),
        status: ApplicationStatus.SUBMITTED,
      },
    });
    console.log(`[Seed] Sample Application created for Maya Sen.`);
  }

  // 9. Sample Payment & Enrollment (testing unique constraint userId + cohortId & money integer)
  if (sampleCohortForEnrollment) {
    const payment = await prisma.payment.upsert({
      where: { orderId: "order_demo_seed_001" },
      update: {},
      create: {
        orderId: "order_demo_seed_001",
        userId: student.id,
        cohortId: sampleCohortForEnrollment.id,
        provider: PaymentProvider.RAZORPAY,
        amount: sampleCohortForEnrollment.priceAmount, // in paise
        currency: "INR",
        status: PaymentStatus.SUCCESS,
        gatewayPaymentId: "pay_demo_rzp_12345",
        gatewaySignature: "sig_demo_sha256_mock",
        idempotencyKey: `bh_seed_idemp_${student.id}_${sampleCohortForEnrollment.id}`,
        metadata: {
          notes: "Seed sample transaction verified via ACID block.",
        },
      },
    });

    await prisma.enrollment.upsert({
      where: {
        userId_cohortId: {
          userId: student.id,
          cohortId: sampleCohortForEnrollment.id,
        },
      },
      update: {},
      create: {
        userId: student.id,
        cohortId: sampleCohortForEnrollment.id,
        paymentId: payment.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    console.log(`[Seed] Sample Payment & Enrollment created.`);
  }

  // 10. Sample Contact Message & Audit Log
  await prisma.contactMessage.create({
    data: {
      fullName: "[SAMPLE INQUIRER]",
      email: "inquiry@techcorp.com",
      topic: "Employer Partnerships",
      message: "We are interested in hiring 4 backend engineering interns from the upcoming December cohort.",
      isRead: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "PLATFORM_INITIALIZATION",
      entityType: "SYSTEM",
      entityId: "seed-init-01",
      details: {
        status: "COMPLETED",
        tracksSeeded: 4,
        programmesSeeded: 6,
        internshipsSeeded: 5,
      },
    },
  });

  console.log("[ByteHUB Prisma Seed] Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("[Seed Error]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
