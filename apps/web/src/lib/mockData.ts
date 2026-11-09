export interface InternshipItem {
  id: string;
  slug: string;
  title: string;
  companyName: string;
  location: string;
  type: string;
  track: string;
  stipend: string;
  duration: string;
  deadline: string;
  aboutRole: string;
  whatYouWillDo: string[];
  requirements: string[];
  skills: string[];
}

export const MOCK_INTERNSHIPS: InternshipItem[] = [
  {
    id: "intern-01",
    slug: "frontend-developer-intern",
    title: "Frontend Developer Intern",
    companyName: "[COMPANY NAME]",
    location: "[LOCATION]",
    type: "[REMOTE / ON-SITE]",
    track: "Web Development",
    stipend: "[STIPEND]",
    duration: "[WEEKS]",
    deadline: "[DATE]",
    aboutRole: "[Two or three lines describing the project and team.]",
    whatYouWillDo: [
      "Build interface components from designs",
      "Fix bugs and review code with a mentor",
      "Present your work in weekly demos",
    ],
    requirements: [
      "Basic HTML, CSS and JavaScript",
      "[Any programme prerequisite]",
    ],
    skills: ["HTML", "CSS", "JavaScript", "React"],
  },
  {
    id: "intern-02",
    slug: "mobile-app-intern",
    title: "Mobile App Intern",
    companyName: "[COMPANY NAME]",
    location: "[LOCATION]",
    type: "[REMOTE / ON-SITE]",
    track: "App Development",
    stipend: "[STIPEND]",
    duration: "[WEEKS]",
    deadline: "[DATE]",
    aboutRole: "[Two or three lines describing the project and team.]",
    whatYouWillDo: [
      "Implement mobile screens using React Native or Flutter",
      "Connect frontend screens to backend REST APIs",
      "Write unit tests for core user interactions",
    ],
    requirements: [
      "Familiarity with mobile interface layout principles",
      "Basic understanding of asynchronous state handling",
    ],
    skills: ["React Native", "Flutter", "TypeScript"],
  },
  {
    id: "intern-03",
    slug: "data-analyst-intern",
    title: "Data Analyst Intern",
    companyName: "[COMPANY NAME]",
    location: "[LOCATION]",
    type: "[REMOTE / ON-SITE]",
    track: "Data & AI",
    stipend: "[STIPEND]",
    duration: "[WEEKS]",
    deadline: "[DATE]",
    aboutRole: "[Two or three lines describing the project and team.]",
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
  },
  {
    id: "intern-04",
    slug: "ui-ux-design-intern",
    title: "UI/UX Design Intern",
    companyName: "[COMPANY NAME]",
    location: "[LOCATION]",
    type: "[REMOTE / ON-SITE]",
    track: "UI/UX Design",
    stipend: "[STIPEND]",
    duration: "[WEEKS]",
    deadline: "[DATE]",
    aboutRole: "[Two or three lines describing the project and team.]",
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
  },
  {
    id: "intern-05",
    slug: "backend-developer-intern",
    title: "Backend Developer Intern",
    companyName: "[COMPANY NAME]",
    location: "[LOCATION]",
    type: "[REMOTE / ON-SITE]",
    track: "Web Development",
    stipend: "[STIPEND]",
    duration: "[WEEKS]",
    deadline: "[DATE]",
    aboutRole: "[Two or three lines describing the project and team.]",
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
  },
];

export interface TrainingProgramItem {
  id: string;
  slug: string;
  title: string;
  trackCategory: "Web" | "App" | "Data & AI" | "Design";
  mode: string;
  weeks: string;
  fee: string;
  startDate: string;
  seatsLeft: string;
  description: string;
  syllabus: {
    week: number;
    title: string;
    description: string;
  }[];
  prerequisites: string[];
}

export const MOCK_TRAINING_PROGRAMS: TrainingProgramItem[] = [
  {
    id: "prog-01",
    slug: "full-stack-web-development",
    title: "Full-Stack Web Development",
    trackCategory: "Web",
    mode: "[MODE]",
    weeks: "[WEEKS]",
    fee: "[FEE]",
    startDate: "[DATE]",
    seatsLeft: "[NUMBER]",
    description:
      "HTML to full-stack, built on real projects. Learn Next.js App Router, strict TypeScript, Tailwind CSS, and database integration.",
    syllabus: [
      { week: 1, title: "Modern HTML & Semantic Layouts", description: "Semantic markup, WCAG accessibility, and responsive grids." },
      { week: 2, title: "TypeScript & React Architecture", description: "Strict typing, component boundaries, and state management." },
      { week: 3, title: "Next.js App Router & Server Components", description: "SSR, streaming, API route handlers, and caching." },
      { week: 4, title: "Database Integration & Full Deployment", description: "PostgreSQL, Prisma, authentication, and cloud deployment." },
    ],
    prerequisites: ["Basic computer literacy", "Commitment to 10-15 hours of weekly laboratory work"],
  },
  {
    id: "prog-02",
    slug: "mobile-app-development",
    title: "Mobile App Development",
    trackCategory: "App",
    mode: "[MODE]",
    weeks: "[WEEKS]",
    fee: "[FEE]",
    startDate: "[DATE]",
    seatsLeft: "[NUMBER]",
    description:
      "Ship a mobile app from idea to store. Build cross-platform applications with React Native, local persistence, and push notifications.",
    syllabus: [
      { week: 1, title: "Mobile UI Layout & Flexbox", description: "Native components, gestures, and responsive view layouts." },
      { week: 2, title: "Navigation & Device Sensors", description: "Stack navigators, camera, location, and storage." },
      { week: 3, title: "App Store Packaging & Release", description: "Build variants, code signing, and beta testing distribution." },
    ],
    prerequisites: ["Familiarity with JavaScript or TypeScript fundamentals"],
  },
  {
    id: "prog-03",
    slug: "data-analytics-with-python",
    title: "Data Analytics with Python",
    trackCategory: "Data & AI",
    mode: "[MODE]",
    weeks: "[WEEKS]",
    fee: "[FEE]",
    startDate: "[DATE]",
    seatsLeft: "[NUMBER]",
    description:
      "Python, analytics and applied machine learning. Extract, clean, and visualize complex datasets to derive actionable intelligence.",
    syllabus: [
      { week: 1, title: "Data Wrangling with Pandas", description: "Dataframes, missing value handling, and grouping." },
      { week: 2, title: "SQL for Analytical Queries", description: "Window functions, common table expressions, and joins." },
      { week: 3, title: "Interactive Dashboards", description: "Storytelling with data visualizations and automated reports." },
    ],
    prerequisites: ["Basic high-school algebra and curiosity about data insights"],
  },
  {
    id: "prog-04",
    slug: "applied-machine-learning",
    title: "Applied Machine Learning",
    trackCategory: "Data & AI",
    mode: "[MODE]",
    weeks: "[WEEKS]",
    fee: "[FEE]",
    startDate: "[DATE]",
    seatsLeft: "[NUMBER]",
    description:
      "Supervised and unsupervised models, evaluation metrics, feature engineering, and model deployment in production.",
    syllabus: [
      { week: 1, title: "Feature Engineering & Preprocessing", description: "Feature selection, scaling, and categorical encoding." },
      { week: 2, title: "Classification & Regression Models", description: "Linear models, random forests, and gradient boosting." },
      { week: 3, title: "Model Serving & APIs", description: "Wrapping models in FastAPI endpoints with Docker containers." },
    ],
    prerequisites: ["Working knowledge of Python and introductory statistics"],
  },
  {
    id: "prog-05",
    slug: "ui-ux-design",
    title: "UI/UX Design",
    trackCategory: "Design",
    mode: "[MODE]",
    weeks: "[WEEKS]",
    fee: "[FEE]",
    startDate: "[DATE]",
    seatsLeft: "[NUMBER]",
    description:
      "Research, wireframes and polished interfaces. Master typography, grid systems, auto-layout, and interactive prototypes in Figma.",
    syllabus: [
      { week: 1, title: "User Research & Information Architecture", description: "User personas, journey mapping, and wireframing." },
      { week: 2, title: "Design Systems & Token Architecture", description: "Color palettes, typography scales, and modular components." },
      { week: 3, title: "High-Fidelity Prototyping & Handoff", description: "Interactive micro-animations and developer specifications." },
    ],
    prerequisites: ["No coding required; laptop capable of running Figma in browser"],
  },
  {
    id: "prog-06",
    slug: "backend-with-nodejs",
    title: "Backend with Node.js",
    trackCategory: "Web",
    mode: "[MODE]",
    weeks: "[WEEKS]",
    fee: "[FEE]",
    startDate: "[DATE]",
    seatsLeft: "[NUMBER]",
    description:
      "Scalable REST and event-driven architectures. Master Node.js, Express, PostgreSQL transactions, indexing, and authentication.",
    syllabus: [
      { week: 1, title: "Event Loop & Asynchronous I/O", description: "Streams, buffers, worker threads, and HTTP architecture." },
      { week: 2, title: "Relational Modeling & Prisma ORM", description: "Schema design, migrations, relations, and ACID transactions." },
      { week: 3, title: "Security & Production Hardening", description: "Rate limiting, JWTs, CORS, structured logging, and Docker." },
    ],
    prerequisites: ["Basic familiarity with JavaScript syntax"],
  },
];
