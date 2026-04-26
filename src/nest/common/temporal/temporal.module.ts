import { Global, Module } from "@nestjs/common";
import { TemporalService, TEMPORAL_SERVICE_TOKEN } from "./temporal.service";

@Global()
@Module({
  providers: [
    TemporalService,
    {
      provide: TEMPORAL_SERVICE_TOKEN,
      useExisting: TemporalService,
    },
  ],
  exports: [TemporalService, TEMPORAL_SERVICE_TOKEN],
})
export class TemporalModule {}
