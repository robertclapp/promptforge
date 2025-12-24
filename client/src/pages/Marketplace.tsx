import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Star, Download, Eye, TrendingUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const utils = trpc.useUtils();
  const { data: categories } = trpc.marketplace.getCategories.useQuery();
  const { data: templates, isLoading } = trpc.marketplace.getTemplates.useQuery({
    categoryId: selectedCategory,
  });
  const { data: searchResults } = trpc.marketplace.searchTemplates.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  const useTemplateMutation = trpc.marketplace.useTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template added to your prompts!");
      setIsDetailOpen(false);
      utils.prompts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to use template");
    },
  });

  const rateTemplateMutation = trpc.marketplace.rateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Rating submitted!");
      setIsRatingOpen(false);
      setRating(5);
      setReview("");
      utils.marketplace.getTemplates.invalidate();
      utils.marketplace.getTemplateStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit rating");
    },
  });

  const displayTemplates = searchQuery.length > 0 ? searchResults : templates;

  const handleViewTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsDetailOpen(true);
  };

  const handleUseTemplate = (templateId: string) => {
    useTemplateMutation.mutate({ promptId: templateId });
  };

  const handleRateTemplate = () => {
    if (!selectedTemplate) return;

    rateTemplateMutation.mutate({
      promptId: selectedTemplate.id,
      rating,
      review: review || undefined,
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderInteractiveStars = (currentRating: number, onChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= currentRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Template Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Discover and use high-quality prompt templates from the community
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {templates && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Templates</p>
                  <p className="text-2xl font-bold">{templates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">
                    {(
                      templates.reduce((sum: number, t: any) => sum + (t.averageRating || 0), 0) /
                      templates.length
                    ).toFixed(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Uses</p>
                  <p className="text-2xl font-bold">
                    {templates.reduce((sum: number, t: any) => sum + (t.usageCount || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates Grid */}
      {displayTemplates && displayTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTemplates.map((template: any) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader onClick={() => handleViewTemplate(template)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(template.averageRating || 0))}
                      <span className="text-muted-foreground">
                        ({template.totalRatings || 0})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="w-4 h-4" />
                      <span>{template.usageCount || 0}</span>
                    </div>
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template.id);
                      }}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewTemplate(template);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No templates found</p>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Check back later for new templates"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Template Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {renderStars(Math.round(selectedTemplate?.averageRating || 0))}
                <span className="text-sm text-muted-foreground">
                  {selectedTemplate?.averageRating?.toFixed(1)} ({selectedTemplate?.totalRatings || 0}{" "}
                  ratings)
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Download className="w-4 h-4" />
                <span>{selectedTemplate?.usageCount || 0} uses</span>
              </div>
            </div>

            <div>
              <Label>Prompt Content</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{selectedTemplate?.content}</pre>
              </div>
            </div>

            {selectedTemplate?.tags && selectedTemplate.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTemplate.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRatingOpen(true);
                setIsDetailOpen(false);
              }}
            >
              <Star className="w-4 h-4 mr-2" />
              Rate Template
            </Button>
            <Button
              onClick={() => handleUseTemplate(selectedTemplate?.id)}
              disabled={useTemplateMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {useTemplateMutation.isPending ? "Adding..." : "Use Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Template</DialogTitle>
            <DialogDescription>Share your experience with this template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating *</Label>
              <div className="mt-2">{renderInteractiveStars(rating, setRating)}</div>
            </div>
            <div>
              <Label>Review (Optional)</Label>
              <Textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts about this template..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRatingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRateTemplate} disabled={rateTemplateMutation.isPending}>
              {rateTemplateMutation.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
