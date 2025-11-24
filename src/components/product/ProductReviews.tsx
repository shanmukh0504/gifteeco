"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";

type Review = {
  user?: string;
  name?: string;
  comment?: string;
  rating: number;
  createdAt?: string;
};

type RatingsSummary = {
  average: number;
  count: number;
};

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { token, user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<RatingsSummary>({
    average: 0,
    count: 0,
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (!res.ok) {
        throw new Error("Failed to fetch reviews");
      }
      const data = await res.json();
      setReviews(data.reviews || []);
      setSummary(data.ratingsSummary || { average: 0, count: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Unable to load reviews right now.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.warning("Please log in to leave a review.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit review");
      }

      const data = await res.json();
      setReviews(data.reviews || []);
      setSummary(data.ratingsSummary || { average: 0, count: 0 });
      setComment("");
      toast.success("Thanks for the feedback!");
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit review";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
          Ratings & Reviews
        </p>
        <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-4xl font-bold text-neutral-900">
              {summary.average.toFixed(1)}
              <span className="text-lg font-medium text-neutral-500">/5</span>
            </p>
            <p className="text-sm text-neutral-500">
              {summary.count} verified reviews
            </p>
          </div>
          <div className="flex items-center gap-1 text-yellow-500">
            {Array.from({ length: 5 }).map((_, index) => (
              <span key={`star-${index}`}>
                {index < Math.round(summary.average) ? "★" : "☆"}
              </span>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-neutral-50/70 p-4"
      >
        <div className="flex flex-col gap-4 md:flex-row">
          <label className="flex flex-col text-sm font-medium text-neutral-700 md:w-1/3">
            Your rating
            <select
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value, 10))}
              className="mt-1 rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand focus:ring-brand"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col text-sm font-medium text-neutral-700">
            Share your experience
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Quality, fit, delivery..."
              className="mt-1 rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand focus:ring-brand"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit" isLoading={loading}>
            {user ? "Submit review" : "Login to review"}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {reviews.length === 0 && (
          <p className="text-sm text-neutral-500">
            Be the first to review this product.
          </p>
        )}
        {reviews.map((review, index) => (
          <div
            key={`${review.user}-${index}`}
            className="rounded-2xl border border-neutral-100 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900">
                  {review.name || "Verified user"}
                </p>
                <p className="text-xs text-neutral-500">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString()
                    : ""}
                </p>
              </div>
              <div className="text-sm font-medium text-yellow-500">
                {"★".repeat(review.rating)}{" "}
                <span className="text-neutral-400">({review.rating})</span>
              </div>
            </div>
            {review.comment && (
              <p className="mt-3 text-sm text-neutral-600 leading-6">
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
