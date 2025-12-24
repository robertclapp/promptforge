/**
 * Star Rating Component
 * Interactive star rating with hover effects
 */

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-transform",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          onClick={() => !readonly && onRatingChange?.(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              star <= displayRating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-muted-foreground"
            )}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-1 text-sm text-muted-foreground">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}

interface RatingDistributionProps {
  distribution: {
    five: number;
    four: number;
    three: number;
    two: number;
    one: number;
  };
  totalRatings: number;
}

export function RatingDistribution({
  distribution,
  totalRatings,
}: RatingDistributionProps) {
  const bars = [
    { label: "5", count: distribution.five },
    { label: "4", count: distribution.four },
    { label: "3", count: distribution.three },
    { label: "2", count: distribution.two },
    { label: "1", count: distribution.one },
  ];

  return (
    <div className="space-y-1">
      {bars.map((bar) => {
        const percentage = totalRatings > 0 ? (bar.count / totalRatings) * 100 : 0;
        return (
          <div key={bar.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-muted-foreground">{bar.label}</span>
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-right text-muted-foreground">
              {bar.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
