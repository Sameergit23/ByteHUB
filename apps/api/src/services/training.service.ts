import { trainingRepository } from "../repositories/training.repository.js";
import { AppError } from "../utils/apiError.js";

export class TrainingService {
  /**
   * List all published programmes, optionally filtered by track slug.
   */
  async listPrograms(trackSlug?: string) {
    const programs = await trainingRepository.findPublished(trackSlug);
    return programs.map((p) => {
      // Find the earliest upcoming published cohort
      const activeCohort = p.cohorts && p.cohorts.length > 0 ? p.cohorts[0] : null;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        description: p.description,
        track: p.track,
        syllabus: p.syllabus,
        prerequisites: p.prerequisites,
        cohorts: p.cohorts,
        // Convenience fields matching wireframe display
        nextCohort: activeCohort
          ? {
              id: activeCohort.id,
              cohortCode: activeCohort.cohortCode,
              startDate: activeCohort.startDate,
              endDate: activeCohort.endDate,
              durationWeeks: activeCohort.durationWeeks,
              mode: activeCohort.mode,
              seatsTotal: activeCohort.seatsTotal,
              seatsLeft: activeCohort.seatsLeft,
              priceAmount: activeCohort.priceAmount, // Stored in paise/cents, integer
              currency: activeCohort.currency,
            }
          : null,
      };
    });
  }

  /**
   * Get single programme with syllabus and available cohorts.
   */
  async getProgram(slugOrId: string) {
    const program = await trainingRepository.findByIdOrSlug(slugOrId);
    if (!program) {
      throw AppError.notFound(`Programme '${slugOrId}' not found.`);
    }
    return program;
  }

  /**
   * Public cohort summary for checkout: price, dates, seats and its programme.
   */
  async getCohort(cohortId: string) {
    const cohort = cohortId ? await trainingRepository.findCohortById(cohortId) : null;
    if (!cohort || !cohort.published || !cohort.programme?.published) {
      throw AppError.notFound("Cohort not found or is closed for enrolments.");
    }

    return {
      id: cohort.id,
      cohortCode: cohort.cohortCode,
      name: cohort.name,
      mode: cohort.mode,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      durationWeeks: cohort.durationWeeks,
      seatsTotal: cohort.seatsTotal,
      seatsLeft: cohort.seatsLeft,
      priceAmount: cohort.priceAmount,
      currency: cohort.currency,
      programme: {
        id: cohort.programme.id,
        slug: cohort.programme.slug,
        title: cohort.programme.title,
        summary: cohort.programme.summary,
      },
    };
  }

  /**
   * The signed-in student's enrolments, with week-by-week progress derived from cohort dates.
   */
  async listMyEnrollments(userId: string) {
    const enrollments = await trainingRepository.findEnrollmentsForUser(userId);
    const now = Date.now();

    return enrollments.map((e) => {
      const start = new Date(e.cohort.startDate).getTime();
      const totalWeeks = Math.max(1, e.cohort.durationWeeks);
      const weeksElapsed = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
      // Week the cohort is currently in (0 = not started yet).
      const currentWeek = now < start ? 0 : Math.min(totalWeeks, weeksElapsed + 1);
      const completedWeeks =
        e.status === "COMPLETED"
          ? totalWeeks
          : Math.max(0, Math.min(totalWeeks, weeksElapsed));
      const isHoldExpired =
        e.status === "PENDING" &&
        !!e.reservedUntil &&
        new Date(e.reservedUntil).getTime() < now;

      return {
        id: e.id,
        status: isHoldExpired ? "EXPIRED" : e.status,
        reservedUntil: e.reservedUntil,
        enrolledAt: e.createdAt,
        progressPercent: Math.round((completedWeeks / totalWeeks) * 100),
        currentWeek,
        cohort: {
          id: e.cohort.id,
          cohortCode: e.cohort.cohortCode,
          name: e.cohort.name,
          mode: e.cohort.mode,
          startDate: e.cohort.startDate,
          endDate: e.cohort.endDate,
          durationWeeks: e.cohort.durationWeeks,
        },
        programme: {
          id: e.cohort.programme.id,
          slug: e.cohort.programme.slug,
          title: e.cohort.programme.title,
          syllabus: e.cohort.programme.syllabus,
        },
        certificate: e.certificate
          ? {
              id: e.certificate.id,
              certificateCode: e.certificate.certificateCode,
              title: e.certificate.title,
              issuedAt: e.certificate.issuedAt,
              revokedAt: e.certificate.revokedAt,
            }
          : null,
      };
    });
  }

  /**
   * Atomically reserve a seat for 15 minutes or immediately confirm if free.
   */
  async reserveSeat(userId: string, cohortId: string) {
    if (!cohortId) {
      throw AppError.badRequest("Cohort ID is required.");
    }

    try {
      const result = await trainingRepository.reserveSeatAtomic({
        userId,
        cohortId,
        reservationMinutes: 15,
      });

      return {
        enrollmentId: result.enrollment.id,
        status: result.enrollment.status,
        reservedUntil: result.enrollment.reservedUntil,
        priceAmount: result.enrollment.priceAmount,
        currency: result.enrollment.currency,
        isFree: result.enrollment.priceAmount === 0,
        alreadyEnrolled: result.alreadyEnrolled,
        cohort: {
          id: result.cohort.id,
          cohortCode: result.cohort.cohortCode,
          name: result.cohort.name,
          startDate: result.cohort.startDate,
          endDate: result.cohort.endDate,
          durationWeeks: result.cohort.durationWeeks,
          mode: result.cohort.mode,
          programmeTitle: result.cohort.programme?.title,
          programmeSlug: result.cohort.programme?.slug,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "SEATS_EXHAUSTED") {
        throw AppError.badRequest(
          "All seats in this cohort have already been filled.",
          "SEATS_EXHAUSTED"
        );
      }
      if (message === "COHORT_NOT_FOUND") {
        throw AppError.notFound("Cohort not found or is no longer accepting enrolments.");
      }
      throw err;
    }
  }

  /**
   * Get enrolment summary for checkout.
   * Protects against IDOR: only the enrolled student or an ADMIN can view.
   */
  async getEnrollmentSummary(
    enrollmentId: string,
    requestingUserId: string,
    requestingRole: string
  ) {
    const enrollment = await trainingRepository.findEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw AppError.notFound("Enrolment not found.");
    }

    // IDOR protection
    if (enrollment.userId !== requestingUserId && requestingRole !== "ADMIN") {
      throw AppError.forbidden(
        "Access denied: You cannot view another student's enrolment."
      );
    }

    const isExpired =
      enrollment.status === "PENDING" &&
      enrollment.reservedUntil &&
      new Date(enrollment.reservedUntil).getTime() < Date.now();

    return {
      id: enrollment.id,
      status: isExpired ? "EXPIRED" : enrollment.status,
      reservedUntil: enrollment.reservedUntil,
      priceAmount: enrollment.priceAmount,
      currency: enrollment.currency,
      isExpired,
      user: {
        id: enrollment.user.id,
        email: enrollment.user.email,
        name: enrollment.user.name,
      },
      cohort: {
        id: enrollment.cohort.id,
        cohortCode: enrollment.cohort.cohortCode,
        name: enrollment.cohort.name,
        mode: enrollment.cohort.mode,
        startDate: enrollment.cohort.startDate,
        endDate: enrollment.cohort.endDate,
        durationWeeks: enrollment.cohort.durationWeeks,
        programme: {
          id: enrollment.cohort.programme.id,
          slug: enrollment.cohort.programme.slug,
          title: enrollment.cohort.programme.title,
          summary: enrollment.cohort.programme.summary,
        },
      },
    };
  }

  /**
   * Background expiry cleanup of expired unpaid reservations.
   */
  async expireReservations() {
    return trainingRepository.expireUnpaidReservations();
  }
}

export const trainingService = new TrainingService();
