import { Module } from "@nestjs/common";
import { WorkflowWorkerService } from "./worker.service";
import { TemporalModule } from "../temporal/temporal.module";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Module({
  imports: [TemporalModule, EventEmitterModule],
  providers: [WorkflowWorkerService],
  exports: [WorkflowWorkerService],
})
export class WorkflowModule {}
