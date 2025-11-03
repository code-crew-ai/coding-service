import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { GitService } from "./git.service";

describe("GitService", () => {
  let service: GitService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                "git.baseReposPath": "/tmp/base-repos",
                "git.worktreesPath": "/tmp/worktrees",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GitService>(GitService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Additional tests would mock git operations
  // For now, this provides basic structure
});
