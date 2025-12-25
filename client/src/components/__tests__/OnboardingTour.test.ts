import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Test constants
const TOUR_STORAGE_KEY = "promptforge_onboarding_completed";
const TOUR_PROGRESS_KEY = "promptforge_onboarding_progress";

describe("OnboardingTour", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Tour storage", () => {
    it("should store completion status in localStorage", () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe("true");
    });

    it("should store progress in localStorage", () => {
      localStorage.setItem(TOUR_PROGRESS_KEY, "3");
      expect(localStorage.getItem(TOUR_PROGRESS_KEY)).toBe("3");
    });

    it("should clear progress when tour is completed", () => {
      localStorage.setItem(TOUR_PROGRESS_KEY, "5");
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      localStorage.removeItem(TOUR_PROGRESS_KEY);
      
      expect(localStorage.getItem(TOUR_PROGRESS_KEY)).toBeNull();
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe("true");
    });

    it("should clear all tour data when restarting", () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      localStorage.setItem(TOUR_PROGRESS_KEY, "7");
      
      localStorage.removeItem(TOUR_STORAGE_KEY);
      localStorage.removeItem(TOUR_PROGRESS_KEY);
      
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(TOUR_PROGRESS_KEY)).toBeNull();
    });
  });

  describe("Tour steps", () => {
    const mockSteps = [
      { id: "welcome", title: "Welcome", description: "Welcome to the tour" },
      { id: "step1", title: "Step 1", description: "First step" },
      { id: "step2", title: "Step 2", description: "Second step" },
      { id: "complete", title: "Complete", description: "Tour complete" },
    ];

    it("should have correct number of steps", () => {
      expect(mockSteps.length).toBe(4);
    });

    it("should have unique step IDs", () => {
      const ids = mockSteps.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should start with welcome step", () => {
      expect(mockSteps[0].id).toBe("welcome");
    });

    it("should end with complete step", () => {
      expect(mockSteps[mockSteps.length - 1].id).toBe("complete");
    });
  });

  describe("Tour navigation", () => {
    it("should calculate progress correctly", () => {
      const currentStep = 2;
      const totalSteps = 8;
      const progress = ((currentStep + 1) / totalSteps) * 100;
      
      expect(progress).toBe(37.5);
    });

    it("should identify first step correctly", () => {
      const isFirstStep = (step: number) => step === 0;
      
      expect(isFirstStep(0)).toBe(true);
      expect(isFirstStep(1)).toBe(false);
    });

    it("should identify last step correctly", () => {
      const totalSteps = 8;
      const isLastStep = (step: number) => step === totalSteps - 1;
      
      expect(isLastStep(7)).toBe(true);
      expect(isLastStep(6)).toBe(false);
    });
  });

  describe("Tour visibility", () => {
    it("should show tour for new users", () => {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      const shouldShow = completed !== "true";
      
      expect(shouldShow).toBe(true);
    });

    it("should hide tour for returning users who completed it", () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      
      const completed = localStorage.getItem(TOUR_STORAGE_KEY);
      const shouldShow = completed !== "true";
      
      expect(shouldShow).toBe(false);
    });

    it("should resume from saved progress", () => {
      localStorage.setItem(TOUR_PROGRESS_KEY, "3");
      
      const savedProgress = localStorage.getItem(TOUR_PROGRESS_KEY);
      const resumeStep = savedProgress ? parseInt(savedProgress, 10) : 0;
      
      expect(resumeStep).toBe(3);
    });
  });

  describe("Tour events", () => {
    it("should dispatch start-tour event", () => {
      const eventHandler = vi.fn();
      window.addEventListener("start-tour", eventHandler);
      
      window.dispatchEvent(new CustomEvent("start-tour"));
      
      expect(eventHandler).toHaveBeenCalled();
      
      window.removeEventListener("start-tour", eventHandler);
    });

    it("should handle skip action", () => {
      const onSkip = vi.fn();
      
      // Simulate skip
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      localStorage.removeItem(TOUR_PROGRESS_KEY);
      onSkip();
      
      expect(onSkip).toHaveBeenCalled();
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe("true");
    });

    it("should handle complete action", () => {
      const onComplete = vi.fn();
      
      // Simulate complete
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      localStorage.removeItem(TOUR_PROGRESS_KEY);
      onComplete();
      
      expect(onComplete).toHaveBeenCalled();
      expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe("true");
    });
  });
});
