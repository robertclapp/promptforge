import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Custom hook for managing prompts
 * Provides CRUD operations with optimistic updates and error handling
 */
export function usePrompts(filters?: {
  organizationId?: string;
  search?: string;
  tags?: string[];
  isTemplate?: boolean;
}) {
  const utils = trpc.useUtils();

  // Queries
  const { data: prompts, isLoading, error } = trpc.prompts.list.useQuery(filters || {});

  // Mutations
  const createMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      toast.success("Prompt created successfully!");
      utils.prompts.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create prompt");
    },
  });

  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      toast.success("Prompt updated successfully!");
      utils.prompts.list.invalidate();
      utils.prompts.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update prompt");
    },
  });

  const deleteMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => {
      toast.success("Prompt deleted successfully!");
      utils.prompts.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete prompt");
    },
  });

  return {
    // Data
    prompts,
    isLoading,
    error,

    // Actions
    createPrompt: createMutation.mutate,
    updatePrompt: updateMutation.mutate,
    deletePrompt: deleteMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for managing a single prompt
 */
export function usePrompt(id: string) {
  const utils = trpc.useUtils();
  
  const { data: prompt, isLoading, error } = trpc.prompts.get.useQuery({ id });
  const { data: versions } = trpc.prompts.getVersions.useQuery({ promptId: id });

  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      toast.success("Prompt updated successfully!");
      utils.prompts.get.invalidate({ id });
      utils.prompts.getVersions.invalidate({ promptId: id });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update prompt");
    },
  });

  return {
    prompt,
    versions,
    isLoading,
    error,
    updatePrompt: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
