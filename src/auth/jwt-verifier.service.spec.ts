import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { JwtVerifierService } from "./jwt-verifier.service";
import * as jwt from "jsonwebtoken";

describe("JwtVerifierService", () => {
  let service: JwtVerifierService;
  let configService: ConfigService;
  const testSecret = "test-secret-key";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtVerifierService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(testSecret),
          },
        },
      ],
    }).compile();

    service = module.get<JwtVerifierService>(JwtVerifierService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("verifyTaskToken", () => {
    it("should successfully verify a valid token", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = jwt.sign({ taskId, orgId, userId }, testSecret);

      expect(() => {
        service.verifyTaskToken(token, taskId, orgId, userId);
      }).not.toThrow();
    });

    it("should throw UnauthorizedException for invalid signature", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = jwt.sign({ taskId, orgId, userId }, "wrong-secret");

      expect(() => {
        service.verifyTaskToken(token, taskId, orgId, userId);
      }).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for taskId mismatch", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = jwt.sign({ taskId, orgId, userId }, testSecret);

      expect(() => {
        service.verifyTaskToken(token, "different-task", orgId, userId);
      }).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for orgId mismatch", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = jwt.sign({ taskId, orgId, userId }, testSecret);

      expect(() => {
        service.verifyTaskToken(token, taskId, "different-org", userId);
      }).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for userId mismatch", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = jwt.sign({ taskId, orgId, userId }, testSecret);

      expect(() => {
        service.verifyTaskToken(token, taskId, orgId, "different-user");
      }).toThrow(UnauthorizedException);
    });
  });

  describe("generateInternalToken", () => {
    it("should generate a valid JWT token", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = service.generateInternalToken(taskId, orgId, userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // Verify the token can be decoded
      const decoded = jwt.verify(token, testSecret) as any;
      expect(decoded.taskId).toBe(taskId);
      expect(decoded.orgId).toBe(orgId);
      expect(decoded.userId).toBe(userId);
    });

    it("should include expiration in generated token", () => {
      const taskId = "task-123";
      const orgId = "org-456";
      const userId = "user-789";

      const token = service.generateInternalToken(taskId, orgId, userId);
      const decoded = jwt.verify(token, testSecret) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});
