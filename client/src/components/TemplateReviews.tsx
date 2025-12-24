/**
 * Template Reviews Component
 * Display and submit reviews for templates
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { StarRating, RatingDistribution } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface TemplateReviewsProps {
  templateId: string;
  templateType?: "builtin" | "user";
}

export function TemplateReviews({
  templateId,
  templateType = "builtin",
}: TemplateReviewsProps) {
  const { user } = useAuth();
  const [newRating, setNewRating] = useState(0);
  const [newReview, setNewReview] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } =
    trpc.templateRatings.getStats.useQuery({ templateId });

  const { data: reviews, isLoading: reviewsLoading } =
    trpc.templateRatings.getByTemplate.useQuery({
      templateId,
      limit: 10,
    });

  const { data: userRating } = trpc.templateRatings.getUserRating.useQuery(
    { templateId },
    { enabled: !!user }
  );

  const rateMutation = trpc.templateRatings.rate.useMutation({
    onSuccess: () => {
      toast.success("Review submitted!");
      setShowReviewForm(false);
      setNewRating(0);
      setNewReview("");
      utils.templateRatings.getStats.invalidate({ templateId });
      utils.templateRatings.getByTemplate.invalidate({ templateId });
      utils.templateRatings.getUserRating.invalidate({ templateId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const voteHelpfulMutation = trpc.templateRatings.voteHelpful.useMutation({
    onSuccess: () => {
      utils.templateRatings.getByTemplate.invalidate({ templateId });
    },
  });

  const handleSubmitReview = () => {
    if (newRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    rateMutation.mutate({
      templateId,
      templateType,
      rating: newRating,
      review: newReview || undefined,
    });
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ratings & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-5xl font-bold">
                {stats?.averageRating.toFixed(1) || "0.0"}
              </div>
              <StarRating
                rating={stats?.averageRating || 0}
                readonly
                size="lg"
              />
              <div className="text-sm text-muted-foreground mt-1">
                {stats?.totalRatings || 0} ratings •{" "}
                {stats?.totalReviews || 0} reviews
              </div>
            </div>

            {/* Rating Distribution */}
            {stats && stats.totalRatings > 0 && (
              <RatingDistribution
                distribution={stats.distribution}
                totalRatings={stats.totalRatings}
              />
            )}
          </div>

          {/* Write Review Button */}
          {user && !userRating && !showReviewForm && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setShowReviewForm(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Write a Review
            </Button>
          )}

          {/* User's Existing Rating */}
          {userRating && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                Your rating:
              </div>
              <StarRating rating={userRating.rating} readonly size="sm" />
              {userRating.review && (
                <p className="text-sm mt-2">{userRating.review}</p>
              )}
            </div>
          )}

          {/* Review Form */}
          {showReviewForm && (
            <div className="mt-4 p-4 border rounded-lg space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Rating
                </label>
                <StarRating
                  rating={newRating}
                  onRatingChange={setNewRating}
                  size="lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Review (optional)
                </label>
                <Textarea
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  placeholder="Share your experience with this template..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  disabled={rateMutation.isPending}
                >
                  {rateMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Submit Review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false);
                    setNewRating(0);
                    setNewReview("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews && reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b last:border-0 pb-4 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {(review.userName || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {review.userName || "Anonymous"}
                      </span>
                      <StarRating rating={review.rating} readonly size="sm" />
                    </div>
                    {review.review && (
                      <p className="text-sm mt-1">{review.review}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        {review.createdAt
                          ? formatDistanceToNow(new Date(review.createdAt), {
                              addSuffix: true,
                            })
                          : "Recently"}
                      </span>
                      {user && review.userId !== user.id && (
                        <button
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() =>
                            voteHelpfulMutation.mutate({ ratingId: review.id })
                          }
                        >
                          <ThumbsUp className="h-3 w-3" />
                          Helpful ({review.helpful || 0})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
