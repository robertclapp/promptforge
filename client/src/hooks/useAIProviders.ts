import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Custom hook for managing AI providers
 * Handles secure API key management and provider operations
 */
export function useAIProviders(organizationId?: string) {
  const utils = trpc.useUtils();

  // Queries
  const { data: providers, isLoading, error } = trpc.aiProviders.list.useQuery({
    organizationId,
  });

  // Mutations
  const createMutation = trpc.aiProviders.create.useMutation({
    onSuccess: () => {
      toast.success("AI Provider added successfully!");
      utils.aiProviders.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add provider");
    },
  });

  const updateMutation = trpc.aiProviders.update.useMutation({
    onSuccess: () => {
      toast.success("Provider updated successfully!");
      utils.aiProviders.list.invalidate();
      utils.aiProviders.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update provider");
    },
  });

  const deleteMutation = trpc.aiProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider deleted successfully!");
      utils.aiProviders.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete provider");
    },
  });

  const testMutation = trpc.aiProviders.test.useMutation({
    onSuccess: () => {
      toast.success("Provider connection successful!");
    },
    onError: (error) => {
      toast.error(error.message || "Provider connection failed");
    },
  });

  return {
    // Data
    providers,
    isLoading,
    error,

    // Actions
    createProvider: createMutation.mutate,
    updateProvider: updateMutation.mutate,
    deleteProvider: deleteMutation.mutate,
    testProvider: testMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,
  };
}

/**
 * Hook for managing a single AI provider
 */
export function useAIProvider(id: string) {
  const utils = trpc.useUtils();
  
  const { data: provider, isLoading, error } = trpc.aiProviders.get.useQuery({ id });

  const updateMutation = trpc.aiProviders.update.useMutation({
    onSuccess: () => {
      toast.success("Provider updated successfully!");
      utils.aiProviders.get.invalidate({ id });
      utils.aiProviders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update provider");
    },
  });

  const testMutation = trpc.aiProviders.test.useMutation({
    onSuccess: () => {
      toast.success("Provider connection successful!");
      utils.aiProviders.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message || "Provider connection failed");
    },
  });

  return {
    provider,
    isLoading,
    error,
    updateProvider: updateMutation.mutate,
    testProvider: testMutation.mutate,
    isUpdating: updateMutation.isPending,
    isTesting: testMutation.isPending,
  };
}
