import { Module } from "@nestjs/common";
import { JwtVerifierService } from "./jwt-verifier.service";

@Module({
  providers: [JwtVerifierService],
  exports: [JwtVerifierService],
})
export class AuthModule {}
