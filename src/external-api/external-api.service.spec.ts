import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { ExternalApiService } from "./external-api.service";
import { of } from "rxjs";

describe("ExternalApiService", () => {
  let service: ExternalApiService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalApiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("http://external-services-api:3000"),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExternalApiService>(ExternalApiService);
    httpService = module.get<HttpService>(HttpService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getInstallationToken", () => {
    it("should successfully fetch installation token", async () => {
      const mockToken = "ghs_test_token_123";
      const mockResponse = { data: { token: mockToken } };

      jest.spyOn(httpService, "post").mockReturnValue(of(mockResponse) as any);

      const token = await service.getInstallationToken(
        "org-123",
        "user-456",
        "task-789",
        "test-owner",
        ["repo1", "repo2"],
        "jwt-token",
      );

      expect(token).toBe(mockToken);
      expect(httpService.post).toHaveBeenCalledWith(
        "http://external-services-api:3000/api/v1/github/installation-token",
        {
          orgId: "org-123",
          userId: "user-456",
          taskId: "task-789",
          owner: "test-owner",
          repos: ["repo1", "repo2"],
        },
        {
          headers: { Authorization: "Bearer jwt-token" },
        },
      );
    });
  });
});
