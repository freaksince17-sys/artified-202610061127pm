import React, { useState, useMemo } from 'react';
import { 
  X, 
  Star, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  MapPin, 
  User, 
  Package, 
  Calendar, 
  Sparkles, 
  MessageSquare, 
  AlertCircle 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { ProductReviewItem, Product } from '../types';
import { getProductReviews } from '../utils/productStats';
import { getRealProductImage } from '../utils/productImages';

interface ReviewWithProduct extends ProductReviewItem {
  productId: string;
  productTitle: string;
  productImage: string;
}

export const SellerReviewsModal: React.FC = () => {
  const { 
    isSellerMode, 
    products, 
    isReviewsManagerOpen, 
    setIsReviewsManagerOpen, 
    updateProductReview, 
    deleteProductReview, 
    addProductReview,
    reviewsManagerProductId,
    setReviewsManagerProductId
  } = useCart();

  const [selectedProductFilter, setSelectedProductFilter] = useState<string>(reviewsManagerProductId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor form state (for both creating and editing reviews)
  const [isEditing, setIsEditing] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [originalProductId, setOriginalProductId] = useState<string>('');
  
  // Form fields
  const [formProductId, setFormProductId] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [formDate, setFormDate] = useState('2 days ago');
  const [formVerified, setFormVerified] = useState(true);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Synchronize when opened with a specific product ID
  React.useEffect(() => {
    if (reviewsManagerProductId) {
      setSelectedProductFilter(reviewsManagerProductId);
    }
  }, [reviewsManagerProductId]);

  // Aggregate all reviews across all products
  const allReviewsWithProduct: ReviewWithProduct[] = useMemo(() => {
    const list: ReviewWithProduct[] = [];
    products.forEach((prod) => {
      const prodReviews = getProductReviews(prod);
      prodReviews.forEach((rev) => {
        list.push({
          ...rev,
          productId: prod.id,
          productTitle: prod.title,
          productImage: getRealProductImage(prod.title, prod.images[0]),
        });
      });
    });
    return list;
  }, [products]);

  // Filter and search reviews
  const filteredReviews = useMemo(() => {
    return allReviewsWithProduct.filter((rev) => {
      // 1. Product filter
      if (selectedProductFilter !== 'all' && rev.productId !== selectedProductFilter) {
        return false;
      }
      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAuthor = rev.author.toLowerCase().includes(q);
        const matchLocation = rev.location.toLowerCase().includes(q);
        const matchComment = rev.comment.toLowerCase().includes(q);
        const matchProduct = rev.productTitle.toLowerCase().includes(q);
        return matchAuthor || matchLocation || matchComment || matchProduct;
      }
      return true;
    });
  }, [allReviewsWithProduct, selectedProductFilter, searchQuery]);

  if (!isSellerMode || !isReviewsManagerOpen) return null;

  const handleOpenCreateForm = () => {
    const defaultProdId = selectedProductFilter !== 'all' 
      ? selectedProductFilter 
      : (products[0]?.id || '');

    setEditingReviewId(null);
    setOriginalProductId(defaultProdId);
    setFormProductId(defaultProdId);
    setFormAuthor('');
    setFormLocation('Kathmandu, Nepal');
    setFormRating(5);
    setFormComment('');
    setFormDate('Just now');
    setFormVerified(true);
    setIsEditing(true);
  };

  const handleOpenEditForm = (rev: ReviewWithProduct) => {
    setEditingReviewId(rev.id);
    setOriginalProductId(rev.productId);
    setFormProductId(rev.productId);
    setFormAuthor(rev.author);
    setFormLocation(rev.location);
    setFormRating(Math.round(rev.rating));
    setFormComment(rev.comment);
    setFormDate(rev.date || 'Recently');
    setFormVerified(rev.verified !== false);
    setIsEditing(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAuthor.trim() || !formComment.trim() || !formProductId) return;

    const payload: ProductReviewItem = {
      id: editingReviewId || `${formProductId}-rev-${Date.now()}`,
      author: formAuthor.trim(),
      location: formLocation.trim() || 'Kathmandu, Nepal',
      rating: formRating,
      comment: formComment.trim(),
      date: formDate.trim() || 'Recently',
      verified: formVerified,
    };

    if (editingReviewId) {
      await updateProductReview(originalProductId, editingReviewId, payload, formProductId);
      setSaveNotice('✨ Review updated successfully!');
    } else {
      await addProductReview(formProductId, payload);
      setSaveNotice('✨ New review published!');
    }

    setTimeout(() => setSaveNotice(null), 3500);
    setIsEditing(false);
  };

  const handleDeleteReview = async (productId: string, reviewId: string) => {
    await deleteProductReview(productId, reviewId);
    setDeleteConfirmId(null);
    setSaveNotice('Review deleted.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleClose = () => {
    setIsReviewsManagerOpen(false);
    setReviewsManagerProductId(null);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div 
        className="fixed inset-0 transition-opacity" 
        onClick={handleClose} 
      />

      <div className="relative bg-[#FAF8F5] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E8DFD8] overflow-hidden z-10 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DFD8] bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center shadow-xs">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base sm:text-lg font-bold text-[#1C1B1A]">
                  Customer Reviews Manager
                </h2>
                <span className="text-[10px] font-semibold text-[#D4AF37] bg-[#1C1B1A] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Seller Studio
                </span>
              </div>
              <p className="text-[11px] text-[#736C65]">
                Edit reviewer names, locations in Nepal, ratings, and reassign reviews across pieces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={handleOpenCreateForm}
                className="px-3.5 py-1.5 bg-[#1C1B1A] hover:bg-[#34312F] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Add Review</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="p-2 rounded-full border border-[#E8DFD8] text-[#736C65] hover:text-[#1C1B1A] hover:bg-[#FAF8F5] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice toast */}
        {saveNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          
          {/* EDITOR FORM VIEW */}
          {isEditing ? (
            <form onSubmit={handleSaveForm} className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8DFD8] shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE5]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#C5A880]" />
                  <span>{editingReviewId ? 'Edit Product Review' : 'Create Customer Review'}</span>
                </h3>
                <span className="text-[11px] text-[#8C7A6B]">
                  Seller Studio Authorization
                </span>
              </div>

              {/* 1. Target Product Selector (Can reassign to ANY product!) */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] space-y-1.5">
                <label className="block text-xs font-bold text-[#1C1B1A] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Product Being Reviewed *</span>
                </label>
                <select
                  required
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-[#D5C7BC] rounded-lg focus:outline-none focus:border-[#1C1B1A] font-medium text-[#1C1B1A]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — NPR {p.price.toLocaleString()} ({p.category.replace('-', ' ')})
                    </option>
                  ))}
                </select>
                {originalProductId && formProductId !== originalProductId && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                    ℹ️ This review will be moved from its current product to <strong>{products.find(p => p.id === formProductId)?.title}</strong>.
                  </p>
                )}
              </div>

              {/* 2. Reviewer Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-[#8C7A6B]" />
                    <span>Reviewer Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="e.g. Alisha Shrestha"
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#8C7A6B]" />
                    <span>Location in Nepal *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Kathmandu, Nepal"
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>
              </div>

              {/* 3. Star Rating & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Rating (1–5 Stars)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        className="p-1 focus:outline-none hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= formRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-[#1C1B1A] ml-2">
                      {formRating} Star{formRating > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#8C7A6B]" />
                    <span>Display Date</span>
                  </label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="e.g. Yesterday / 3 days ago / 1 week ago"
                    className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>
              </div>

              {/* 4. Review Comment */}
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Customer Review Comment *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="Share details on bead weave tension, pearl luster, styling with lehenga/saree, or delivery speed..."
                  className="w-full text-xs p-2.5 bg-[#FAF8F5] border border-[#D5C7BC] rounded-lg focus:outline-none focus:border-[#1C1B1A] leading-relaxed"
                />
              </div>

              {/* 5. Verified Badge Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formVerified}
                  onChange={(e) => setFormVerified(e.target.checked)}
                  className="rounded text-[#C5A880] focus:ring-[#C5A880] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-[#1C1B1A] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Show "Verified Purchase" badge on this review</span>
                </span>
              </label>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F0EBE5]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#736C65] hover:text-[#1C1B1A] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1C1B1A] hover:bg-[#34312F] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>{editingReviewId ? 'Save Review Changes' : 'Publish Review'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* REVIEWS LIST VIEW */
            <>
              {/* Filter and Search Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-[#E8DFD8] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by customer name, location, or comment..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#C5A880]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8C7A6B] hover:text-[#1C1B1A]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#736C65] whitespace-nowrap">Filter Piece:</span>
                  <select
                    value={selectedProductFilter}
                    onChange={(e) => setSelectedProductFilter(e.target.value)}
                    className="text-xs p-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-lg focus:outline-none focus:border-[#C5A880] max-w-[200px] truncate"
                  >
                    <option value="all">All Pieces ({allReviewsWithProduct.length} reviews)</option>
                    {products.map((p) => {
                      const count = getProductReviews(p).length;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.title} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Reviews Summary Stats */}
              <div className="flex items-center justify-between text-xs text-[#736C65] px-1">
                <span>
                  Showing <strong>{filteredReviews.length}</strong> of <strong>{allReviewsWithProduct.length}</strong> reviews
                </span>
                {selectedProductFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedProductFilter('all')}
                    className="text-[#C5A880] hover:underline font-medium"
                  >
                    View all products
                  </button>
                )}
              </div>

              {/* Reviews Grid */}
              {filteredReviews.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-[#E8DFD8] space-y-3">
                  <MessageSquare className="w-10 h-10 text-[#C5A880] mx-auto opacity-50" />
                  <p className="text-sm font-semibold text-[#1C1B1A]">No reviews found matching criteria</p>
                  <p className="text-xs text-[#736C65]">Try changing the product filter or search term</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="px-4 py-2 bg-[#1C1B1A] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Add New Review</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredReviews.map((rev) => (
                    <div
                      key={`${rev.productId}-${rev.id}`}
                      className="p-4 bg-white rounded-xl border border-[#E8DFD8] shadow-2xs hover:border-[#C5A880] transition-all flex flex-col justify-between gap-3 group relative"
                    >
                      {/* Product Header Pill */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE5] gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={rev.productImage}
                            alt=""
                            className="w-7 h-8 rounded object-cover border border-[#E8DFD8] shrink-0"
                          />
                          <p className="text-xs font-bold text-[#1C1B1A] truncate" title={rev.productTitle}>
                            {rev.productTitle}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(rev)}
                            className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#1C1B1A] hover:text-white text-[#736C65] transition-colors shadow-2xs"
                            title="Edit reviewer name, location, rating & review"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {deleteConfirmId === rev.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-0.5 rounded border border-rose-200">
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.productId, rev.id)}
                                className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1 py-0.5 text-[10px] text-zinc-600"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(rev.id)}
                              className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-rose-50 text-[#736C65] hover:text-rose-600 transition-colors shadow-2xs"
                              title="Delete review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Review details */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= Math.round(rev.rating) ? 'fill-amber-400' : 'text-zinc-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-[#A69E96]">{rev.date}</span>
                        </div>

                        <p className="text-xs text-[#4A4541] leading-relaxed line-clamp-3">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>

                      {/* Author & Location Footer */}
                      <div className="pt-2 border-t border-[#F5F2ED] flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-semibold text-[#1C1B1A] flex items-center gap-1">
                            <span>{rev.author}</span>
                          </span>
                          <span className="text-[10px] text-[#8C7A6B] flex items-center gap-0.5 leading-none mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-[#C5A880]" />
                            <span>{rev.location}</span>
                          </span>
                        </div>

                        {rev.verified && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
