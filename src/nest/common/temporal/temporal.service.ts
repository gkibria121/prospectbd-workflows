import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NativeConnection } from "@temporalio/worker";
import { Client } from "@temporalio/client";

export const TEMPORAL_SERVICE_TOKEN = "TEMPORAL_SERVICE_TOKEN";

@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  public nativeConnection: typeof NativeConnection;
  public connection: NativeConnection | null = null;
  public client: Client | null = null;
  constructor() {
    this.nativeConnection = NativeConnection;
  }
  async onModuleInit() {
    const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
    console.log(`[TemporalService] Connecting to Temporal at ${address}...`);

    let lastError: Error | null = null;
    const maxAttempts = 10;
    const delayMs = 5000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.connection = await NativeConnection.connect({
          address,
        });
        console.log(`[TemporalService] Connection established on attempt ${attempt}`);
        break;
      } catch (err) {
        lastError = err as Error;
        console.warn(
          `[TemporalService] Connection attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delayMs / 1000}s...`,
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!this.connection) {
      console.error(`[TemporalService] Failed to connect after ${maxAttempts} attempts.`);
      throw lastError || new Error("Temporal connection failed");
    }

    this.client = new Client({
      connection: this.connection,
      namespace: "default",
    });
  }
  async onModuleDestroy() {
    if (this.connection) await this.connection.close();
    console.log("Temporal connection closed");
  }
}
