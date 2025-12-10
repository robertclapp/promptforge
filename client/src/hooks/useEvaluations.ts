import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Custom hook for managing evaluations
 * Handles prompt testing and comparison across AI providers
 */
export function useEvaluations(filters?: {
  promptId?: string;
  status?: "pending" | "running" | "completed" | "failed";
}) {
  const utils = trpc.useUtils();

  // Queries
  const { data: evaluations, isLoading, error } = trpc.evaluations.list.useQuery(filters || {});

  // Mutations
  const createMutation = trpc.evaluations.create.useMutation({
    onSuccess: () => {
      toast.success("Evaluation created successfully!");
      utils.evaluations.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create evaluation");
    },
  });

  const runMutation = trpc.evaluations.run.useMutation({
    onSuccess: () => {
      toast.success("Evaluation started successfully!");
      utils.evaluations.list.invalidate();
      utils.evaluations.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to run evaluation");
    },
  });

  const deleteMutation = trpc.evaluations.delete.useMutation({
    onSuccess: () => {
      toast.success("Evaluation deleted successfully!");
      utils.evaluations.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete evaluation");
    },
  });

  return {
    // Data
    evaluations,
    isLoading,
    error,

    // Actions
    createEvaluation: createMutation.mutate,
    runEvaluation: runMutation.mutate,
    deleteEvaluation: deleteMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isRunning: runMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for managing a single evaluation with results
 */
export function useEvaluation(id: string) {
  const utils = trpc.useUtils();
  
  const { data: evaluation, isLoading, error } = trpc.evaluations.get.useQuery({ id });
  const { data: results } = trpc.evaluations.getResults.useQuery({ evaluationId: id });

  const runMutation = trpc.evaluations.run.useMutation({
    onSuccess: () => {
      toast.success("Evaluation started successfully!");
      utils.evaluations.get.invalidate({ id });
      utils.evaluations.getResults.invalidate({ evaluationId: id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to run evaluation");
    },
  });

  return {
    evaluation,
    results,
    isLoading,
    error,
    runEvaluation: runMutation.mutate,
    isRunning: runMutation.isPending,
  };
}
