import { prisma } from "../lib/prisma.js";
import { CompleteApplicationInput, ApplicationStatus } from "@bytehub/shared";

export class ApplicationRepository {
  async create(studentId: string, data: CompleteApplicationInput) {
    return prisma.application.create({
      data: {
        internshipId: data.internshipId,
        studentId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        collegeOrUniversity: data.collegeOrUniversity,
        graduationYear: data.graduationYear,
        degree: data.degree,
        githubUrl: data.githubUrl,
        linkedinUrl: data.linkedinUrl,
        portfolioUrl: data.portfolioUrl || null,
        resumeUrl: data.resumeUrl,
        bioSummary: data.bioSummary,
        whyInterested: data.whyInterested,
        relevantProjectDescription: data.relevantProjectDescription,
        availableHoursPerWeek: data.availableHoursPerWeek,
        earliestStartDate: new Date(data.earliestStartDate),
        status: "SUBMITTED",
      },
    });
  }

  async findByStudentAndInternship(studentId: string, internshipId: string) {
    return prisma.application.findFirst({
      where: { studentId, internshipId },
    });
  }

  async findByStudent(studentId: string) {
    return prisma.application.findMany({
      where: { studentId },
      include: {
        internship: {
          select: {
            title: true,
            companyName: true,
            location: true,
            type: true,
            stipend: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByInternship(internshipId: string) {
    return prisma.application.findMany({
      where: { internshipId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: { internship: true },
    });
  }

  async updateStatus(id: string, status: ApplicationStatus, feedbackNote?: string) {
    return prisma.application.update({
      where: { id },
      data: {
        status: status as any,
        ...(feedbackNote !== undefined ? { feedbackNote } : {}),
      },
    });
  }
}

export const applicationRepository = new ApplicationRepository();
