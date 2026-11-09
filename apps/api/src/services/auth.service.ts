import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/apiError.js";
import { SignUpInput, LoginInput } from "@bytehub/shared";

export class AuthService {
  async register(input: SignUpInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict("An account with this email address already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      organizationName: input.role === "COMPANY" ? input.organizationName : null,
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
      },
    };
  }

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized("Invalid email or password credentials");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized("Invalid email or password credentials");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User account not found");
    }
    return user;
  }
}

export const authService = new AuthService();

