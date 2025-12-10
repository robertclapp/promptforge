import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { jobQueue } from "./jobQueue.service";

describe("Job Queue Service", () => {
  // Clean up jobs after each test
  afterEach(() => {
    jobQueue.cleanup(0); // Remove all jobs
  });

  describe("Job Creation", () => {
    it("should create a new job with pending status", async () => {
      const jobId = await jobQueue.addJob("test", { data: "test" });
      
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_/);
      
      const job = jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe("pending");
      expect(job?.type).toBe("test");
      expect(job?.data).toEqual({ data: "test" });
    });

    it("should generate unique job IDs", async () => {
      const jobId1 = await jobQueue.addJob("test", { data: "test1" });
      const jobId2 = await jobQueue.addJob("test", { data: "test2" });
      
      expect(jobId1).not.toBe(jobId2);
    });

    it("should set default maxAttempts to 3", async () => {
      const jobId = await jobQueue.addJob("test", { data: "test" });
      const job = jobQueue.getJob(jobId);
      
      expect(job?.maxAttempts).toBe(3);
    });

    it("should allow custom maxAttempts", async () => {
      const jobId = await jobQueue.addJob("test", { data: "test" }, { maxAttempts: 5 });
      const job = jobQueue.getJob(jobId);
      
      expect(job?.maxAttempts).toBe(5);
    });
  });

  describe("Job Handler Registration", () => {
    it("should register a job handler", () => {
      const handler = vi.fn(async (data: any) => ({ result: "success" }));
      jobQueue.registerHandler("test-handler", handler);
      
      // Handler is registered (we can't directly test this, but it won't throw)
      expect(true).toBe(true);
    });

    it("should execute registered handler for job", async () => {
      const handler = vi.fn(async (data: any) => {
        return { result: data.value * 2 };
      });
      
      jobQueue.registerHandler("math", handler);
      const jobId = await jobQueue.addJob("math", { value: 5 });
      
      // Wait for job to be processed
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.result).toEqual({ result: 10 });
      expect(handler).toHaveBeenCalledWith({ value: 5 });
    });
  });

  describe("Job Execution", () => {
    it("should mark job as completed on success", async () => {
      jobQueue.registerHandler("success-test", async (data) => {
        return { success: true };
      });
      
      const jobId = await jobQueue.addJob("success-test", { data: "test" });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.result).toEqual({ success: true });
      expect(job?.completedAt).toBeDefined();
    });

    it("should retry failed jobs", async () => {
      let attempts = 0;
      jobQueue.registerHandler("retry-test", async (data) => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Temporary failure");
        }
        return { success: true, attempts };
      });
      
      const jobId = await jobQueue.addJob("retry-test", { data: "test" });
      
      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.attempts).toBe(2);
      expect(job?.result.attempts).toBe(2);
    });

    it("should mark job as failed after max attempts", async () => {
      jobQueue.registerHandler("fail-test", async (data) => {
        throw new Error("Permanent failure");
      });
      
      const jobId = await jobQueue.addJob("fail-test", { data: "test" }, { maxAttempts: 2 });
      
      // Wait for all attempts
      await new Promise(resolve => setTimeout(resolve, 7000));
      
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.attempts).toBe(2);
      expect(job?.error).toContain("Permanent failure");
    });
  });

  describe("Job Queries", () => {
    it("should get all jobs", async () => {
      await jobQueue.addJob("test1", { data: "1" });
      await jobQueue.addJob("test2", { data: "2" });
      await jobQueue.addJob("test3", { data: "3" });
      
      const allJobs = jobQueue.getAllJobs();
      expect(allJobs.length).toBeGreaterThanOrEqual(3);
    });

    it("should filter jobs by status", async () => {
      const jobId1 = await jobQueue.addJob("test", { data: "1" });
      const jobId2 = await jobQueue.addJob("test", { data: "2" });
      
      const pendingJobs = jobQueue.getJobsByStatus("pending");
      expect(pendingJobs.length).toBeGreaterThanOrEqual(2);
      expect(pendingJobs.every(j => j.status === "pending")).toBe(true);
    });

    it("should get job by ID", async () => {
      const jobId = await jobQueue.addJob("test", { data: "specific" });
      const job = jobQueue.getJob(jobId);
      
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.data).toEqual({ data: "specific" });
    });

    it("should return undefined for non-existent job", () => {
      const job = jobQueue.getJob("non-existent-id");
      expect(job).toBeUndefined();
    });
  });

  describe("Queue Statistics", () => {
    it("should return accurate queue stats", async () => {
      // Add some jobs
      await jobQueue.addJob("test", { data: "1" });
      await jobQueue.addJob("test", { data: "2" });
      
      const stats = jobQueue.getStats();
      
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("running");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("failed");
      
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.pending).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Job Cleanup", () => {
    it("should remove old completed jobs", async () => {
      jobQueue.registerHandler("cleanup-test", async (data) => {
        return { success: true };
      });
      
      const jobId = await jobQueue.addJob("cleanup-test", { data: "test" });
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Job should exist
      let job = jobQueue.getJob(jobId);
      expect(job?.status).toBe("completed");
      
      // Clean up jobs older than 0 hours (all jobs)
      const removed = jobQueue.cleanup(0);
      expect(removed).toBeGreaterThanOrEqual(1);
      
      // Job should be gone
      job = jobQueue.getJob(jobId);
      expect(job).toBeUndefined();
    });

    it("should not remove pending or running jobs", async () => {
      const jobId = await jobQueue.addJob("test", { data: "test" });
      
      // Try to clean up immediately
      const removed = jobQueue.cleanup(0);
      
      // Pending job should still exist
      const job = jobQueue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job?.status).toBe("pending");
    });
  });

  describe("Error Handling", () => {
    it("should handle jobs with no registered handler", async () => {
      const jobId = await jobQueue.addJob("unregistered-type", { data: "test" });
      
      // Wait for processing attempt
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const job = jobQueue.getJob(jobId);
      expect(job?.status).toBe("failed");
      expect(job?.error).toContain("No handler registered");
    });
  });
});
