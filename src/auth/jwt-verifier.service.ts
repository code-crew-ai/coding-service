import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LoggingClient,
  WINSTON_MODULE_NEST_PROVIDER,
} from "@code-crew-ai/server";
import * as jwt from "jsonwebtoken";

export interface JwtPayload {
  taskId: string;
  orgId: string;
  userId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtVerifierService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggingClient,
    private configService: ConfigService,
  ) {}

  /**
   * Verify JWT signature and claims
   * @throws UnauthorizedException if invalid
   */
  verifyTaskToken(
    token: string,
    taskId: string,
    orgId: string,
    userId: string,
  ): void {
    const secret = this.configService.get<string>("auth.jwtSecret");

    if (!secret) {
      throw new UnauthorizedException("JWT secret not configured");
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;

      // Validate claims match task context
      if (decoded.taskId !== taskId) {
        throw new UnauthorizedException("JWT taskId mismatch");
      }
      if (decoded.orgId !== orgId) {
        throw new UnauthorizedException("JWT orgId mismatch");
      }
      if (decoded.userId !== userId) {
        throw new UnauthorizedException("JWT userId mismatch");
      }

      this.logger.debug(`JWT verified for task ${taskId}`);
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException("Invalid JWT token");
    }
  }

  /**
   * Generate internal JWT for service-to-service calls
   */
  generateInternalToken(taskId: string, orgId: string, userId: string): string {
    const secret = this.configService.get<string>("auth.jwtSecret");

    if (!secret) {
      throw new Error("JWT secret not configured");
    }

    const payload: JwtPayload = { taskId, orgId, userId };
    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }
}
