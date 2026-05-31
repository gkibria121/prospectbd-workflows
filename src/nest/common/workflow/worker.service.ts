import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { createSendEscalationAlertActivity } from "./alert.activity";
import { createPublishEventActivity } from "./publisher.activity";
import { Worker } from "@temporalio/worker";
import { TemporalService } from "../temporal/temporal.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class WorkflowWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private workerInstance: Worker | null = null;
  private workerPromise: Promise<void> | null = null;

  constructor(
    @Inject(EventEmitter2)
    private readonly eventEmitter: EventEmitter2,
    private readonly temporalService: TemporalService,
  ) {}

  async onModuleDestroy() {
    if (this.workerInstance) {
      console.log("Shutting down temporal workflow worker...");
      this.workerInstance.shutdown();
      if (this.workerPromise) {
        await this.workerPromise;
      }
    }
  }

  async onApplicationBootstrap() {
    this.runWorker().catch((err) => {
      console.error("Worker failed to start", err);
    });
  }

  async runWorker() {
    const publishEvent = createPublishEventActivity(this.eventEmitter);
    const sendEscalationAlert = createSendEscalationAlertActivity(this.eventEmitter);

    this.workerInstance = await Worker.create({
      connection: this.temporalService.connection!,
      workflowsPath: require.resolve("./workflows"),
      activities: { publishEvent, sendEscalationAlert },
      taskQueue: "core-backend",
    });

    console.log("Starting temporal workflow worker");
    this.workerPromise = this.workerInstance.run();
    await this.workerPromise;
  }
}
