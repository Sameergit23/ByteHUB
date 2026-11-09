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
    } catch (err: any) {
      if (err.message === "SEATS_EXHAUSTED") {
        throw AppError.badRequest(
          "All seats in this cohort have already been filled.",
          "SEATS_EXHAUSTED"
        );
      }
      if (err.message === "COHORT_NOT_FOUND") {
        throw AppError.notFound("Cohort not found or is no longer accepting enrolments.");
      }
      throw err;
    }
  }

  /**
   * Get enrolment summary for checkout.
   * Protects against IDOR: only the enrolled student or an ADMIN can view.
   */
  async getEnrollmentSummary(enrollmentId: string, requestingUserId: string, requestingRole: string) {
    const enrollment = await trainingRepository.findEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw AppError.notFound("Enrolment not found.");
    }

    // IDOR protection
    if (enrollment.userId !== requestingUserId && requestingRole !== "ADMIN") {
      throw AppError.forbidden("Access denied: You cannot view another student's enrolment.");
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
