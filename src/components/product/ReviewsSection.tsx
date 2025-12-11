"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import type { Review } from "./types";

type ReviewsSectionProps = {
  productId: string;
  reviews: Review[];
  loading: boolean;
  ratingsSummary?: {
    average: number;
    count: number;
  };
  reviewsSectionRef: React.RefObject<HTMLDivElement | null>;
};

export default function ReviewsSection({
  productId,
  reviews,
  loading,
  ratingsSummary,
  reviewsSectionRef,
}: ReviewsSectionProps) {
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [showWriteReview, setShowWriteReview] = useState(false);
  const { isAuthenticated, token } = useAuthStore();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        dist[review.rating as keyof typeof dist]++;
      }
    });
    return dist;
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    switch (sortBy) {
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
      case "highest":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "lowest":
        return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      default:
        return sorted;
    }
  }, [reviews, sortBy]);

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !token) {
      toast.error("Please login to write a review");
      return;
    }

    if (reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!reviewComment.trim()) {
      toast.error("Please write a review comment");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      if (response.ok) {
        await response.json();
        toast.success("Review submitted successfully!");
        setShowWriteReview(false);
        setReviewRating(0);
        setReviewComment("");
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div ref={reviewsSectionRef} className="bg-neutral-50 py-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  const average = ratingsSummary?.average || 0;
  const count = ratingsSummary?.count || reviews.length;

  return (
    <div ref={reviewsSectionRef} className="bg-neutral-50 py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Customer Reviews
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "newest" | "oldest" | "highest" | "lowest"
                )
              }
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            >
              <option value="newest">Sort by newest review</option>
              <option value="oldest">Sort by oldest review</option>
              <option value="highest">Sort by highest rating</option>
              <option value="lowest">Sort by lowest rating</option>
            </select>
            <button
              onClick={() => setShowWriteReview(!showWriteReview)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 transition"
            >
              Write a Review
            </button>
          </div>
        </div>

        {showWriteReview && (
          <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              Write a Review
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-neutral-700">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-2xl transition"
                    >
                      {star <= reviewRating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-neutral-700">
                  Review
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="rounded-lg bg-[#FF9AA2] px-6 py-2 text-sm text-white hover:bg-[#FF7A85] transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  onClick={() => {
                    setShowWriteReview(false);
                    setReviewRating(0);
                    setReviewComment("");
                  }}
                  className="rounded-lg border border-neutral-300 px-6 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="mb-4">
                <div className="mb-2 text-4xl font-semibold text-neutral-900">
                  {average.toFixed(1)}
                </div>
                <div className="mb-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-6 w-6 ${
                        star <= Math.round(average)
                          ? "fill-yellow-400"
                          : "fill-neutral-300"
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <div className="text-sm text-neutral-600">
                  ({count} {count === 1 ? "Review" : "Reviews"})
                </div>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count =
                    ratingDistribution[
                      rating as keyof typeof ratingDistribution
                    ];
                  const percentage =
                    reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="w-8 text-sm text-neutral-600">
                        {rating} ⭐
                      </span>
                      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            count > 0 ? "bg-orange-500" : "bg-neutral-300"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm text-neutral-600">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-6">
              {sortedReviews.map((review, index) => (
                <div
                  key={index}
                  className={`rounded-lg border border-neutral-200 bg-white p-6 ${
                    index < sortedReviews.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF9AA2] text-sm font-semibold text-white">
                      {getInitials(review.name || "Anonymous")}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">
                          {review.name || "Anonymous"}
                        </span>
                        <span className="text-sm text-neutral-500">
                          {formatDate(review.createdAt || new Date())}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (review.rating || 0)
                                ? "fill-yellow-400"
                                : "fill-neutral-300"
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-700">
                        {review.comment || "No comment provided."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

