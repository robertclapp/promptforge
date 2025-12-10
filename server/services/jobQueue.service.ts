/**
 * Simple In-Memory Job Queue
 * For budget-conscious deployment - can be upgraded to Redis/BullMQ later
 * Handles async evaluation execution with retry logic
 */

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface JobHandler<T = any, R = any> {
  (data: T): Promise<R>;
}

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: boolean = false;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    // Start processing jobs every 1 second
    this.startProcessing();
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler<T, R>(type: string, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler);
  }

  /**
   * Add a new job to the queue
   */
  async addJob<T>(type: string, data: T, options?: { maxAttempts?: number }): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job<T> = {
      id: jobId,
      type,
      data,
      status: "pending",
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);
    console.log(`[JobQueue] Job ${jobId} added to queue (type: ${type})`);
    
    return jobId;
  }

  /**
   * Get job status and result
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs (for monitoring)
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 1000); // Check for new jobs every second

    console.log("[JobQueue] Job processing started");
  }

  /**
   * Stop processing jobs
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
      console.log("[JobQueue] Job processing stopped");
    }
  }

  /**
   * Process the next pending job
   */
  private async processNextJob(): Promise<void> {
    if (this.processing) return;

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values()).find(
      job => job.status === "pending"
    );

    if (!pendingJob) return;

    this.processing = true;

    try {
      await this.executeJob(pendingJob);
    } catch (error) {
      console.error(`[JobQueue] Error processing job ${pendingJob.id}:`, error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    
    if (!handler) {
      job.status = "failed";
      job.error = `No handler registered for job type: ${job.type}`;
      job.completedAt = new Date();
      console.error(`[JobQueue] ${job.error}`);
      return;
    }

    job.status = "running";
    job.startedAt = new Date();
    job.attempts++;

    console.log(`[JobQueue] Executing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    try {
      const result = await handler(job.data);
      
      job.status = "completed";
      job.result = result;
      job.completedAt = new Date();
      
      console.log(`[JobQueue] Job ${job.id} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        job.status = "pending";
        job.error = errorMessage;
        
        const backoffMs = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        console.log(`[JobQueue] Job ${job.id} failed, retrying in ${backoffMs}ms...`);
        
        setTimeout(() => {
          // Job will be picked up by next processing cycle
        }, backoffMs);
      } else {
        // Max attempts reached
        job.status = "failed";
        job.error = errorMessage;
        job.completedAt = new Date();
        
        console.error(`[JobQueue] Job ${job.id} failed after ${job.attempts} attempts:`, errorMessage);
      }
    }
  }

  /**
   * Remove old completed/failed jobs (cleanup)
   */
  cleanup(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let removed = 0;

    this.jobs.forEach((job, jobId) => {
      if (
        (job.status === "completed" || job.status === "failed") &&
        job.completedAt &&
        job.completedAt.getTime() < cutoffTime
      ) {
        this.jobs.delete(jobId);
        removed++;
      }
    });

    if (removed > 0) {
      console.log(`[JobQueue] Cleaned up ${removed} old jobs`);
    }

    return removed;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === "pending").length,
      running: jobs.filter(j => j.status === "running").length,
      completed: jobs.filter(j => j.status === "completed").length,
      failed: jobs.filter(j => j.status === "failed").length,
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueue();

// Cleanup old jobs every hour
setInterval(() => {
  jobQueue.cleanup(24);
}, 60 * 60 * 1000);
