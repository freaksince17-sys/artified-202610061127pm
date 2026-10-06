import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  Image as ImageIcon, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { compressImage } from '../utils/imageCompressor';
import { CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const SellerProductModal: React.FC = () => {
  const { 
    isSellerModalOpen, 
    setIsSellerModalOpen, 
    editingProduct, 
    setEditingProduct,
    updateProduct, 
    addProduct, 
    deleteProduct,
    products,
    setIsCatalogListOpen,
    isCloudSynced,
    syncStatusText,
    bestsellerThreshold,
    setBestsellerThreshold
  } = useCart();

  const isEditing = Boolean(editingProduct);

  const currentIndex = editingProduct 
    ? products.findIndex((p) => p.id === editingProduct.id) 
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < products.length - 1;

  const handlePrevProduct = () => {
    if (hasPrev) {
      setEditingProduct(products[currentIndex - 1]);
    }
  };

  const handleNextProduct = () => {
    if (hasNext) {
      setEditingProduct(products[currentIndex + 1]);
    }
  };

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<'pearl-bags' | 'pearl-necklaces' | 'macrame' | 'accessories' | 'custom-beaded'>('pearl-bags');
  const [price, setPrice] = useState<number>(3500);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(4000);
  const [inStock, setInStock] = useState<boolean>(true);
  const [stockCount, setStockCount] = useState<number>(5);
  const [isBestSeller, setIsBestSeller] = useState<boolean>(false);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(true);
  const [leadTime, setLeadTime] = useState('Handmade to order: 2–4 business days');
  const [description, setDescription] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [dimensions, setDimensions] = useState('18cm × 14cm × 6cm');
  const [weight, setWeight] = useState('350g');
  const [tagsText, setTagsText] = useState('Handcrafted, New Arrival');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Ratings, Reviews, and Units Sold State (Seller controllable)
  const [rating, setRating] = useState<number>(5.0);
  const [reviewsCount, setReviewsCount] = useState<number>(24);
  const [soldCount, setSoldCount] = useState<number>(64);

  // Populate form when editingProduct changes
  useEffect(() => {
    setIsConfirmingDelete(false);
    setUploadError(null);
    if (editingProduct) {
      setTitle(editingProduct.title);
      setSubtitle(editingProduct.subtitle || '');
      setCategory(editingProduct.category);
      setPrice(editingProduct.price);
      setOriginalPrice(editingProduct.originalPrice);
      setInStock(editingProduct.inStock);
      setStockCount(editingProduct.stockCount);
      setIsBestSeller(Boolean(editingProduct.isBestSeller));
      setIsNewArrival(Boolean(editingProduct.isNewArrival));
      setRating(editingProduct.rating ?? 5.0);
      setReviewsCount(editingProduct.reviewsCount ?? 24);
      setSoldCount(editingProduct.soldCount ?? (editingProduct.reviewsCount ? editingProduct.reviewsCount * 3 + 12 : 54));
      setLeadTime(editingProduct.leadTime || 'Handmade to order: 2–4 business days');
      setDescription(editingProduct.description || '');
      setMaterialsText(editingProduct.materials ? editingProduct.materials.join('\n') : '');
      setDimensions(editingProduct.dimensions || '');
      setWeight(editingProduct.weight || '');
      setTagsText(editingProduct.tags ? editingProduct.tags.join(', ') : '');
      setImages(editingProduct.images || []);
    } else {
      // Default template for new piece
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setTitle(`New Handcrafted Piece #${randomSuffix}`);
      setSubtitle('Custom hand-beaded pearl couture crafted in Kathmandu, Nepal');
      setCategory('pearl-bags');
      setPrice(3950);
      setOriginalPrice(4500);
      setInStock(true);
      setStockCount(4);
      setIsBestSeller(false);
      setIsNewArrival(true);
      setRating(4.8);
      setReviewsCount(18);
      setSoldCount(36);
      setLeadTime('Handmade to order: 2–4 business days');
      setDescription('Meticulously hand-woven using high-luster pearls and reinforced tensile core.');
      setMaterialsText('10mm Premium high-luster acrylic pearls\nDual-reinforced nylon monofilament core\nChampagne gold-tone brass clasps');
      setDimensions('18cm (L) × 14cm (H) × 6cm (W)');
      setWeight('350g');
      setTagsText('Handcrafted, Nepal, New Arrival');
      setImages([]);
    }
  }, [editingProduct, isSellerModalOpen]);

  if (!isSellerModalOpen) return null;

  // Image Upload handler: compresses photo to web-optimized quality for instant cloud sync & fast mobile viewing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Photo exceeds 25MB. Please choose a slightly smaller image.');
      return;
    }

    try {
      // Auto compress photo to max 1000px JPEG (~80-120KB)
      const compressed = await compressImage(file, 1000, 1000, 0.82);
      setImages((prev) => [...prev, compressed]);
    } catch (err) {
      console.warn('Compression failed, using standard reader:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) setImages((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAddUrlImage = () => {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index > 0) {
      setImages((prev) => {
        const copy = [...prev];
        const temp = copy[index - 1];
        copy[index - 1] = copy[index];
        copy[index] = temp;
        return copy;
      });
    } else if (direction === 'right' && index < images.length - 1) {
      setImages((prev) => {
        const copy = [...prev];
        const temp = copy[index + 1];
        copy[index + 1] = copy[index];
        copy[index] = temp;
        return copy;
      });
    }
  };

  const executeSave = (actionAfter: 'close' | 'next' | 'list' = 'close') => {
    const materials = materialsText
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean);

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const categoryFallbacks: Record<string, string> = {
      'pearl-bags': 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80',
      'pearl-necklaces': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
      'macrame': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',
      'accessories': 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=900&q=80',
      'custom-beaded': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
    };
    const fallbackImage = categoryFallbacks[category] || categoryFallbacks['pearl-bags'];

    const finalImages = images.length > 0 ? images : [fallbackImage];

    const productPayload: Product = {
      id: editingProduct?.id || `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      rating: Number(rating) || 5.0,
      reviewsCount: Number(reviewsCount) >= 0 ? Number(reviewsCount) : 1,
      soldCount: Number(soldCount) >= 0 ? Number(soldCount) : 0,
      onlineSalesCount: editingProduct?.onlineSalesCount || 0,
      isHandmade: true,
      isBestSeller: ((Number(soldCount) || 0) + (editingProduct?.onlineSalesCount || 0)) >= bestsellerThreshold,
      isNewArrival,
      inStock,
      stockCount: Number(stockCount) || 1,
      leadTime: leadTime.trim(),
      materials: materials.length > 0 ? materials : ['High-luster handcrafted pearls', 'Reinforced nylon thread'],
      dimensions: dimensions.trim(),
      weight: weight.trim(),
      description: description.trim(),
      careNotes: editingProduct?.careNotes || [
        'Avoid direct perfumes or alcohol sprays on pearls.',
        'Wipe gently with soft cloth after wearing.',
        'Store inside breathable dust bag.'
      ],
      images: finalImages,
      tags: tags.length > 0 ? tags : ['Handcrafted']
    };

    if (isEditing) {
      updateProduct(productPayload);
    } else {
      addProduct(productPayload);
    }

    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      if (actionAfter === 'next' && hasNext) {
        setEditingProduct(products[currentIndex + 1]);
      } else if (actionAfter === 'list') {
        setIsSellerModalOpen(false);
        setIsCatalogListOpen(true);
      } else {
        setIsSellerModalOpen(false);
      }
    }, 450);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave('close');
  };

  const handleDelete = () => {
    if (editingProduct && confirm(`Are you sure you want to remove "${editingProduct.title}" from your storefront?`)) {
      deleteProduct(editingProduct.id);
      setIsSellerModalOpen(false);
    }
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify({
      title,
      subtitle,
      category,
      price,
      originalPrice,
      inStock,
      stockCount,
      leadTime,
      materials: materialsText.split('\n').filter(Boolean),
      dimensions,
      weight,
      description,
      images,
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean)
    }, null, 2);

    navigator.clipboard.writeText(jsonStr);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#1C1B1A]/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={() => setIsSellerModalOpen(false)}
      />

      <div className="relative bg-[#FAF8F5] border border-[#E8DFD8] w-full max-w-3xl rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-[#E8DFD8] sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setIsSellerModalOpen(false);
                setIsCatalogListOpen(true);
              }}
              className="px-2.5 py-1.5 text-xs text-[#736C65] hover:text-[#1C1B1A] bg-[#FAF8F5] hover:bg-[#F4EFEB] border border-[#E8DFD8] rounded-xl flex items-center gap-1.5 transition-colors font-medium"
              title="Return to full catalog list view"
            >
              <Layers className="w-3.5 h-3.5 text-[#C5A880]" />
              <span className="hidden sm:inline">All Products ({products.length})</span>
              <span className="sm:hidden">List</span>
            </button>

            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-semibold text-[#1C1B1A] truncate max-w-[180px] sm:max-w-xs">
                {isEditing ? 'Edit Piece' : 'Add New Piece'}
              </h2>
              <p className="text-[10px] text-[#736C65] tracking-wide uppercase font-medium">
                Product Catalog Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stepper for rapid sequential editing */}
            {isEditing && currentIndex !== -1 && (
              <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl p-1 text-xs text-[#736C65]">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={handlePrevProduct}
                  className={`p-1 rounded-md transition-colors ${hasPrev ? 'hover:bg-white text-[#1C1B1A]' : 'opacity-30 cursor-not-allowed'}`}
                  title="Previous piece in catalog"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[11px] font-mono font-medium">
                  {currentIndex + 1} of {products.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={handleNextProduct}
                  className={`p-1 rounded-md transition-colors ${hasNext ? 'hover:bg-white text-[#1C1B1A]' : 'opacity-30 cursor-not-allowed'}`}
                  title="Next piece in catalog"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyJson}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5E5955] border border-[#E8DFD8] rounded-lg hover:bg-[#FAF8F5] transition-colors"
              title="Copy piece schema as JSON"
            >
              <Copy className="w-3.5 h-3.5 text-[#8C7A6B]" />
              <span>{copiedCode ? 'Copied!' : 'JSON'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSellerModalOpen(false)}
              className="p-1.5 text-[#736C65] hover:text-[#1C1B1A] rounded-full hover:bg-[#FAF8F5] transition-colors"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time live cloud sync notification bar */}
        <div className="bg-[#FAF6F0] border-b border-[#E8DFD8] px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-[#736C65]">
          <span className="flex items-center gap-2 font-medium text-[#4A453F]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Live Cloud Sync: Saving here updates this piece instantly on your smartphone.</span>
          </span>
          <span className="text-[11px] text-stone-500 hidden sm:inline">Auto-compressed for fast mobile loading</span>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-[#1C1B1A]">
          
          {/* SECTION 1: PHOTO MANAGEMENT */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E8DFD8] space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Product Photos ({images.length})</span>
                </h3>
                <p className="text-[11px] text-[#736C65]">
                  First photo is the main cover image shown on product cards and in search.
                </p>
              </div>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="relative group aspect-[4/5] rounded-lg overflow-hidden border border-[#E8DFD8] bg-[#FAF8F5] shadow-2xs"
                >
                  <img 
                    src={img?.trim() || CAVIAR_PEARL_BAG_IMAGE} 
                    alt={`Product shot ${idx + 1}`} 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                    }}
                    className="w-full h-full object-cover" 
                  />
                  
                  {/* Badge */}
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-[#1C1B1A]/85 text-[#FAF8F5] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                      Cover
                    </span>
                  )}

                  {/* Hover Controls */}
                  <div className="absolute inset-0 bg-[#1C1B1A]/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-1.5">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'left')}
                          className="p-1 bg-white/90 text-[#1C1B1A] rounded hover:bg-white text-[10px]"
                          title="Move left (make primary)"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                      )}
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'right')}
                          className="p-1 bg-white/90 text-[#1C1B1A] rounded hover:bg-white text-[10px]"
                          title="Move right"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload New Box */}
              <label className="relative aspect-[4/5] rounded-lg border-2 border-dashed border-[#C5A880]/60 bg-[#FAF8F5] hover:bg-[#F4EFEB] flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center">
                <Upload className="w-5 h-5 text-[#C5A880] mb-1" />
                <span className="text-[11px] font-semibold text-[#1C1B1A]">Upload Photo</span>
                <span className="text-[9px] text-[#736C65]">From computer or phone</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="hidden" 
                />
              </label>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* URL input alternative */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Or paste an image web URL (e.g. Unsplash or Cloudinary)..."
                className="flex-1 text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
              />
              <button
                type="button"
                onClick={handleAddUrlImage}
                className="px-4 py-2 bg-[#FAF8F5] border border-[#C5A880] text-[#1C1B1A] text-xs font-semibold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Add Image URL</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: BASIC PRODUCT INFO */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E8DFD8] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A]">
              Piece Information & Story
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Maya Aurelia Structured Pearl Bag"
                className="w-full text-xs sm:text-sm px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Subtitle / Spec Summary
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Signature 10mm high-luster ivory pearls with detachable brass chain"
                className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Collection / Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                >
                  <option value="pearl-bags">Pearl Bags</option>
                  <option value="pearl-necklaces">Pearl Necklaces</option>
                  <option value="macrame">Macrame</option>
                  <option value="accessories">Accessories</option>
                  <option value="custom-beaded">Custom Beaded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Handmade Making Time (Lead Time)
                </label>
                <input
                  type="text"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  placeholder="e.g. Handmade to order: 2–4 business days"
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Handmade Description & Story
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the hours of labor, bead weaving technique, and what fits inside..."
                className="w-full text-xs p-3 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880] leading-relaxed"
              />
            </div>
          </div>

          {/* SECTION 3: PRICING & INVENTORY */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E8DFD8] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A]">
              Pricing (in NPR) & Stock
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Price (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full text-xs font-bold px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Original Price (Rs.)
                </label>
                <input
                  type="number"
                  min={0}
                  value={originalPrice || ''}
                  onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="For strike-through"
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  In Stock Status
                </label>
                <select
                  value={inStock ? 'true' : 'false'}
                  onChange={(e) => setInStock(e.target.value === 'true')}
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                >
                  <option value="true">In Stock</option>
                  <option value="false">Sold Out / Pre-order</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Stock Units Left
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockCount}
                  onChange={(e) => setStockCount(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            {/* Automated Bestseller & Badges */}
            <div className="pt-2 border-t border-[#F0EBE5] space-y-3">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8DFD8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1B1A]">Monthly Bestseller Sales Rule</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                      (Number(soldCount || 0) + (editingProduct?.onlineSalesCount || 0)) >= bestsellerThreshold
                        ? 'bg-[#1C1B1A] text-[#E6C687] border border-[#C5A880]/50'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}>
                      {(Number(soldCount || 0) + (editingProduct?.onlineSalesCount || 0)) >= bestsellerThreshold
                        ? '★ Qualified as Bestseller'
                        : 'Standard Piece'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#736C65] mt-0.5">
                    Automatically awarded when total units sold &ge; monthly threshold.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-[#1C1B1A] whitespace-nowrap">
                    Monthly Threshold:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bestsellerThreshold}
                    onChange={(e) => setBestsellerThreshold(Math.max(1, Number(e.target.value)))}
                    className="w-18 text-xs font-bold px-2 py-1 bg-white border border-[#C5A880] rounded-md text-center text-[#1C1B1A] focus:outline-none"
                    title="Change the monthly sales threshold to qualify for Bestseller badge"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="rounded text-[#C5A880] focus:ring-[#C5A880]"
                  />
                  <span>Mark as "New Arrival"</span>
                </label>
              </div>
            </div>

            {/* Social Proof & Metrics: Stars, Reviews (30-50%), Units Sold + Live Tracking */}
            <div className="pt-3 border-t border-[#F0EBE5]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#736C65]">
                  Public Proof & Sales Metrics
                </h4>
                <span className="text-[10px] text-[#C5A880] font-medium">
                  Reviews automatically fluctuate between 30%–50% of sold count
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Star Rating (1.0 – 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Base Units Sold (Editable)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={soldCount}
                    onChange={(e) => {
                      const newSold = Math.max(0, Number(e.target.value));
                      setSoldCount(newSold);
                      // Auto-fluctuate reviews within 30-50%
                      const calculatedReviews = Math.max(1, Math.round(newSold * 0.38));
                      setReviewsCount(calculatedReviews);
                    }}
                    className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[#736C65] mt-1">
                    <span>Online Sales: <strong>+{editingProduct?.onlineSalesCount || 0}</strong></span>
                    <span>Total Sold: <strong className="text-[#1C1B1A]">{(Number(soldCount) || 0) + (editingProduct?.onlineSalesCount || 0)}</strong></span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                    Customer Reviews Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={reviewsCount}
                    onChange={(e) => setReviewsCount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                  />
                  <p className="text-[10px] text-[#736C65] mt-1">
                    {Math.round((reviewsCount / Math.max(1, (Number(soldCount) || 0) + (editingProduct?.onlineSalesCount || 0))) * 100)}% of total sold
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: MATERIALS, SPECS & TAGS */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E8DFD8] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B1A]">
              Materials, Specs & Tags
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Handcrafted Materials (One line per bullet)
              </label>
              <textarea
                rows={3}
                value={materialsText}
                onChange={(e) => setMaterialsText(e.target.value)}
                placeholder="10mm High-luster acrylic pearls&#10;Reinforced monofilament core&#10;Champagne gold clasp"
                className="w-full text-xs p-3 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880] font-mono text-[11px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Dimensions
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. 19cm (L) × 14cm (H) × 6cm (W)"
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                  Weight
                </label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 390g"
                  className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1B1A] mb-1">
                Search Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="Best Seller, Wedding Guest, Statement Bag, Pearl Couture"
                className="w-full text-xs px-3 py-2 border border-[#E8DFD8] rounded-lg bg-[#FAF8F5] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8DFD8]">
            {isEditing ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  <span className="text-xs text-rose-800 font-medium">Permanently delete piece?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProduct) {
                        deleteProduct(editingProduct.id);
                        setIsSellerModalOpen(false);
                        setIsConfirmingDelete(false);
                      }
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1 bg-white border border-[#E8DFD8] text-xs text-[#5E5955] rounded-lg hover:bg-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 self-start sm:self-auto py-2 px-3 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Piece</span>
                </button>
              )
            ) : <div />}

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsSellerModalOpen(false);
                  setIsCatalogListOpen(true);
                }}
                className="px-4 py-2.5 border border-[#E8DFD8] bg-white text-xs font-semibold text-[#5E5955] rounded-xl hover:text-[#1C1B1A] transition-colors"
                title="Return to the full product list without saving"
              >
                Back to List
              </button>

              {hasNext && (
                <button
                  type="button"
                  onClick={() => executeSave('next')}
                  className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-white text-[#1C1B1A] border border-[#C5A880] text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
                  title="Save current changes and move to the next piece in catalog"
                >
                  <span>Save & Next Piece</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C5A880]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => executeSave('list')}
                className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-white text-[#1C1B1A] border border-[#E8DFD8] text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
                title="Save changes and open the product list"
              >
                <Layers className="w-3.5 h-3.5 text-[#8C7A6B]" />
                <span>Save & Back to List</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1C1B1A] text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-[#34312F] transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {savedNotice ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>{isEditing ? 'Save & Close' : 'Publish'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
