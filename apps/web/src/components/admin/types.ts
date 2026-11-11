/** Shapes of the admin API responses (see apps/api/src/routes/admin.routes.ts). */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export interface AdminMetrics {
  userCount: number;
  internshipCount: number;
  applicationCount: number;
  activeEnrollments: number;
  unhandledMessages: number;
  newApplications?: number;
  totalRevenueINR: number;
  totalRevenueUSD: number;
}

export type Role = "STUDENT" | "COMPANY" | "ADMIN";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationName: string | null;
  createdAt: string;
}

export type InternshipStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface AdminInternship {
  id: string;
  slug: string;
  title: string;
  companyName: string;
  location: string;
  type: string;
  stipendAmount: number;
  /** Paid online by the student when applying, in paise. 0 = free. */
  registrationFeeAmount: number;
  currency: string;
  durationMonths: number;
  description: string;
  whatYouWillDo: string[];
  requirements: string[];
  skills: string[];
  openings: number;
  deadline: string;
  status: InternshipStatus;
  trackId?: string | null;
  createdAt: string;
  company: { name: string; organizationName: string | null; email: string } | null;
  _count?: { applications: number };
}

export interface AdminCohort {
  id: string;
  name: string;
  cohortCode: string;
  mode: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  seatsTotal: number;
  seatsLeft: number;
  priceAmount: number;
  currency?: string;
  published?: boolean;
  programme: { title: string; slug: string } | null;
  _count?: { enrollments: number };
}

export interface AdminEnrolment {
  id: string;
  status: string;
  priceAmount?: number;
  currency?: string;
  reservedUntil?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  cohort: { cohortCode: string; programme: { title: string } | null } | null;
  certificate?: { certificateCode: string; revokedAt: string | null } | null;
}

export interface CompletionResult {
  enrollmentId: string;
  certificateCode: string;
  newlyIssued: boolean;
}

export interface CohortCompletionSummary {
  cohortCode: string;
  completed: number;
  certificatesIssued: number;
  failed: { enrollmentId: string; reason: string }[];
}

export interface AdminPayment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  /** A training seat, or an internship registration fee. */
  kind?: "TRAINING" | "INTERNSHIP_FEE";
  cohortCode: string | null;
  programmeTitle: string | null;
  refundedAmount: number;
}

export interface AdminMessage {
  id: string;
  fullName: string;
  email: string;
  topic: string;
  message: string;
  isRead: boolean;
  respondedAt: string | null;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { email: string; name: string } | null;
}

export interface JobStats {
  activeCount: number;
  completedCount: number;
  failedDlqCount: number;
}

export interface FailedJob {
  id: string;
  name: string;
  attemptsMade: number;
  maxAttempts: number;
  createdAt: string;
  failedAt?: string;
  failedReason?: string;
}

export interface HealthReport {
  status: string;
  service?: string;
  environment?: string;
  version?: string;
  uptimeSeconds?: number;
  responseTimeMs?: number;
  checks?: {
    database?: { status: string; latencyMs?: number };
    memory?: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
  };
}

export interface Envelope<T> {
  status?: string;
  message?: string;
  data: T;
}

export type ApplicationStatus =
  | "PENDING_PAYMENT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INTERVIEW"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN";

/** The registration fee a student paid with an application (and any refund of it). */
export interface ApplicationFee {
  orderId: string;
  amount: number;
  currency: string;
  status: "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED";
  refundedAmount: number;
  refundedAt: string | null;
}

export interface AdminApplication {
  id: string;
  internshipId: string;
  fullName: string;
  email: string;
  phone: string;
  country?: string | null;
  pincode?: string | null;
  addressLine?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  collegeOrUniversity: string;
  graduationYear: number;
  degree: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  bioSummary: string | null;
  whyInterested: string | null;
  relevantProjectDescription: string | null;
  availableHoursPerWeek: number;
  earliestStartDate: string;
  status: ApplicationStatus;
  feedbackNote: string | null;
  createdAt: string;
  hasResume: boolean;
  fee: ApplicationFee | null;
  internship: {
    id: string;
    title: string;
    companyName: string;
    slug: string;
    registrationFeeAmount?: number;
  } | null;
}

export interface AdminTrack {
  id: string;
  slug: string;
  name: string;
}

export interface SyllabusWeek {
  week: number;
  title: string;
  description: string;
}

export interface AdminProgramme {
  id: string;
  trackId: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  syllabus: SyllabusWeek[];
  prerequisites: string[];
  published: boolean;
  track: { id: string; name: string } | null;
  _count?: { cohorts: number };
}
