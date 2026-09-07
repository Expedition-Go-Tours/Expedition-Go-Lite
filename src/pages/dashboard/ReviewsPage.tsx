import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyReviews } from "../../hooks/useExpeditionReviews";
import OptimizedImage from "@/components/shared/OptimizedImage";

export default function ReviewsPage() {
  const navigate = useNavigate();
  const { data: reviews = [], isLoading, isError } = useMyReviews();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[var(--bv-muted)]">
        Loading your reviews...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-[var(--bv-border)] shadow-sm">
        <h3 className="text-xl font-heading font-semibold text-[var(--bv-ink)] mb-2">Couldn't load your reviews</h3>
        <p className="text-sm text-[var(--bv-muted)] max-w-sm leading-relaxed">
          Something went wrong while fetching your reviews. Please try again later.
        </p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-[var(--bv-border)] shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bv-accent-soft)] flex items-center justify-center mb-5">
          <Star size={28} className="text-[var(--bv-accent)] fill-[var(--bv-accent)]" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-[var(--bv-ink)] mb-2">No Reviews Yet</h3>
        <p className="text-sm text-[var(--bv-muted)] max-w-sm leading-relaxed mb-7">
          You haven't reviewed any tours yet. Share your experience to help other travelers!
        </p>
        <Button onClick={() => navigate('/tours')} className="bg-[var(--bv-accent)] text-white hover:bg-[var(--bv-accent-strong)] rounded-xl">
          Browse Tours
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto space-y-4">
      <AnimatePresence mode="popLayout">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-[var(--bv-border)] overflow-hidden shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:gap-4 sm:p-5">
              <div className="relative w-full h-44 sm:w-[72px] sm:h-[72px] sm:rounded-lg overflow-hidden shrink-0 bg-[var(--bv-surface-2)]">
                {review.tourImage && (
                  <OptimizedImage src={review.tourImage} alt={review.tourTitle} className="w-full h-full object-cover" width={200} />
                )}
              </div>

              <div className="flex-1 min-w-0 p-4 sm:p-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-heading font-semibold text-[var(--bv-ink)] line-clamp-2 sm:truncate">{review.tourTitle}</h3>
                    <p className="text-[13px] text-[var(--bv-muted)] mt-0.5">{review.tourLocation}</p>
                    {review.status === 'PENDING' && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                        Pending approval
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < review.rating ? "text-[var(--bv-success-text)] fill-[var(--bv-success-text)]" : "text-[var(--bv-faint)]"}
                        />
                      ))}
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--bv-ink)]">
                      {Number(review.rating).toFixed(1)}
                    </span>
                  </div>
                </div>

                {review.title && (
                  <p className="text-[14px] font-semibold text-[var(--bv-ink)] mt-2">{review.title}</p>
                )}
                <p className={`text-[14px] text-[var(--bv-muted)] mt-1 leading-relaxed ${expandedId !== review.id && review.comment.length > 120 ? "line-clamp-2" : ""}`}>
                  {review.comment}
                </p>

                {review.comment.length > 120 && (
                  <button
                    onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                    className="flex items-center gap-1 text-[13px] font-medium text-[var(--bv-accent-strong)] mt-1.5 hover:underline"
                  >
                    {expandedId === review.id ? "Show less" : "Read more"}
                    {expandedId === review.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                {review.supplierResponse && (
                  <div className="mt-3 pl-3 border-l-2 border-[var(--bv-accent)]">
                    <p className="text-[12px] font-semibold text-[var(--bv-accent-strong)]">
                      Operator&apos;s response
                    </p>
                    <p className="text-[13px] text-[var(--bv-text)] mt-0.5 leading-relaxed">
                      {review.supplierResponse}
                    </p>
                    {review.supplierResponseAt && (
                      <p className="text-[11px] text-[var(--bv-faint)] mt-1">
                        {new Date(review.supplierResponseAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[var(--bv-border)] flex-nowrap min-w-0">
                  <span className="text-[13px] text-[var(--bv-faint)] truncate min-w-0">
                    {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
