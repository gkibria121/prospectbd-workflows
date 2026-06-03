import { Module } from "@nestjs/common";
import { WorkflowWorkerService } from "./worker.service";
import { TemporalModule } from "../temporal/temporal.module";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [
    TemporalModule,
    EventEmitterModule.forRoot({
      wildcard: true, // Enable wildcard support
      delimiter: ".", // Default delimiter for namespaces
    }),
  ],
  providers: [WorkflowWorkerService],
  exports: [WorkflowWorkerService],
})
export class WorkflowModule {}
