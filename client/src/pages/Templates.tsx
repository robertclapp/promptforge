import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Headphones, Code, PenTool, BarChart3, Globe, FileText, 
  Sparkles, Briefcase, ArrowRight, Copy, Check, Star, Clock, Zap
} from "lucide-react";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ElementType> = {
  customer_support: Headphones,
  code_review: Code,
  content_writing: PenTool,
  data_analysis: BarChart3,
  translation: Globe,
  summarization: FileText,
  creative: Sparkles,
  business: Briefcase
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-500 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  advanced: "bg-red-500/10 text-red-500 border-red-500/20"
};

export default function Templates() {
  const [, navigate] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch data
  const { data: categories } = trpc.templates.getCategories.useQuery();
  const { data: allTemplates } = trpc.templates.getAll.useQuery();
  const { data: featured } = trpc.templates.getFeatured.useQuery();
  const { data: stats } = trpc.templates.getStats.useQuery();
  const { data: searchResults } = trpc.templates.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const importMutation = trpc.templates.import.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Template imported successfully!");
        setShowPreview(false);
        navigate(`/prompts/${result.promptId}`);
      } else {
        toast.error(result.error || "Failed to import template");
      }
    }
  });

  // Filter templates
  const displayTemplates = searchQuery.length > 2 
    ? searchResults 
    : selectedCategory === "all" 
      ? allTemplates 
      : allTemplates?.filter(t => t.category === selectedCategory);

  const handleCopyContent = () => {
    if (selectedTemplate) {
      navigator.clipboard.writeText(selectedTemplate.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImport = () => {
    if (selectedTemplate) {
      importMutation.mutate({
        templateId: selectedTemplate.id,
        workspaceId: 1 // Default workspace
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prompt Templates</h1>
          <p className="text-muted-foreground mt-1">
            Professional, production-ready templates to jumpstart your prompts
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {stats.total} templates
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {stats.categories} categories
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Featured Section */}
      {!searchQuery && selectedCategory === "all" && featured && featured.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Featured Templates</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((template) => {
              const Icon = categoryIcons[template.category] || FileText;
              return (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowPreview(true);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <Badge variant="outline" className={difficultyColors[template.difficulty]}>
                          {template.difficulty}
                        </Badge>
                      </div>
                      <Badge variant="secondary">{template.categoryName}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{template.estimatedTokens} tokens
                      </span>
                      <Button variant="ghost" size="sm" className="gap-1">
                        Preview <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            All Templates
          </TabsTrigger>
          {categories?.map((cat) => {
            const Icon = categoryIcons[cat.id] || FileText;
            return (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                {cat.name}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {cat.templateCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {displayTemplates && displayTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayTemplates.map((template) => {
                const Icon = categoryIcons[template.category] || FileText;
                return (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreview(true);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <Badge variant="outline" className={difficultyColors[template.difficulty]}>
                          {template.difficulty}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {template.variables.length} variables
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{template.estimatedTokens} tokens
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const Icon = categoryIcons[selectedTemplate.category] || FileText;
                    return (
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    );
                  })()}
                  <Badge>{selectedTemplate.categoryName}</Badge>
                  <Badge variant="outline" className={difficultyColors[selectedTemplate.difficulty]}>
                    {selectedTemplate.difficulty}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">{selectedTemplate.name}</DialogTitle>
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Variables</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((v: string) => (
                        <Badge key={v} variant="outline" className="font-mono">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Prompt Content</h4>
                    <Button variant="ghost" size="sm" onClick={handleCopyContent}>
                      {copied ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                    {selectedTemplate.content}
                  </pre>
                </div>

                {/* Use Cases */}
                {selectedTemplate.useCases && selectedTemplate.useCases.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Use Cases</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {selectedTemplate.useCases.map((uc: string, i: number) => (
                        <li key={i}>{uc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tips */}
                {selectedTemplate.tips && selectedTemplate.tips.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tips</h4>
                    <ul className="space-y-2">
                      {selectedTemplate.tips.map((tip: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <Sparkles className="h-4 w-4 mt-0.5 text-yellow-500 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <h4 className="font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button onClick={handleImport} disabled={importMutation.isPending}>
                  {importMutation.isPending ? "Importing..." : "Use This Template"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
