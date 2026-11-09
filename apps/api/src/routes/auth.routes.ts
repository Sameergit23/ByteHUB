import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { validateBody } from "../middleware/validate.js";
import { authenticateJWT } from "../middleware/auth.js";
import { SignUpSchema, LoginSchema } from "@bytehub/shared";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(SignUpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, role, organizationName } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        status: "fail",
        code: "USER_EXISTS",
        message: "An account with this email already exists",
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        organizationName: role === "COMPANY" ? organizationName : null,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      status: "success",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
      },
    });
  }
);

authRouter.post(
  "/login",
  validateBody(LoginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        status: "fail",
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        status: "fail",
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      status: "success",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationName: user.organizationName,
      },
    });
  }
);

authRouter.get(
  "/me",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationName: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        status: "fail",
        code: "USER_NOT_FOUND",
        message: "User account not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      user,
    });
  }
);
