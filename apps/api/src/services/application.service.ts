import { applicationRepository } from "../repositories/application.repository.js";
import { internshipRepository } from "../repositories/internship.repository.js";
import { AppError } from "../utils/apiError.js";
import { CompleteApplicationInput, ApplicationStatus } from "@bytehub/shared";

export class ApplicationService {
  async submitApplication(studentId: string, input: CompleteApplicationInput) {
    const internship = await internshipRepository.findById(input.internshipId);
    if (!internship || internship.status !== "PUBLISHED") {
      throw AppError.badRequest("Internship is closed or does not exist");
    }

    const existing = await applicationRepository.findByStudentAndInternship(
      studentId,
      input.internshipId
    );
    if (existing) {
      throw AppError.conflict("An application has already been submitted for this position");
    }

    return applicationRepository.create(studentId, input);
  }

  async getStudentApplications(studentId: string) {
    return applicationRepository.findByStudent(studentId);
  }

  async getInternshipApplications(internshipId: string, userId: string, userRole: string) {
    const internship = await internshipRepository.findById(internshipId);
    if (!internship) {
      throw AppError.notFound("Internship not found");
    }

    if (userRole !== "ADMIN" && internship.companyId !== userId) {
      throw AppError.forbidden("Access denied for candidate submissions of this posting");
    }

    return applicationRepository.findByInternship(internshipId);
  }

  async updateStatus(
    applicationId: string,
    status: ApplicationStatus,
    feedbackNote: string | undefined,
    userId: string,
    userRole: string
  ) {
    const application = await applicationRepository.findById(applicationId);
    if (!application) {
      throw AppError.notFound("Application not found");
    }

    if (userRole !== "ADMIN" && application.internship.companyId !== userId) {
      throw AppError.forbidden("Access denied");
    }

    return applicationRepository.updateStatus(applicationId, status, feedbackNote);
  }
}

export const applicationService = new ApplicationService();
