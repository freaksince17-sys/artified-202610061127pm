import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  ShoppingBag, 
  Trash2, 
  ArrowRight, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Sparkles,
  Cloud,
  LogIn,
  LogOut,
  Smartphone,
  Laptop
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getRealProductImage, CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

export const WishlistDrawer: React.FC = () => {
  const {
    products,
    wishlist,
    isWishlistOpen,
    setIsWishlistOpen,
    toggleWishlist,
    addToCart,
    setQuickViewProduct,
    currentUser,
    isUserLoggedIn,
    loginWithGoogle,
    logoutUser,
    isWishlistCloudSynced
  } = useCart();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isWishlistOpen) return null;

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  const handleMoveToCart = (product: any) => {
    addToCart(product, 1);
    toggleWishlist(product.id);
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
    } catch (err) {
      console.warn('Google sign-in canceled or failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getWishlistShareUrl = () => {
    const origin = window.location.origin;
    return `${origin}/?wishlist=${wishlist.join(',')}`;
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(getWishlistShareUrl());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const shareUrl = getWishlistShareUrl();
    const itemsText = wishlistedProducts
      .map((p, idx) => `${idx + 1}. ${p.title} (Rs. ${p.price.toLocaleString()})`)
      .join('\n');
    const totalPrice = wishlistedProducts.reduce((sum, p) => sum + p.price, 0);

    const message = `Namaste! ✨ Check out my curated wishlist of handmade pearl pieces from Artified Nepal:\n\n${itemsText}\n\nTotal: Rs. ${totalPrice.toLocaleString()} • Handcrafted in Kathmandu\n\nTake a look at my saved pieces here:\n${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Artified Nepal Wishlist',
          text: `Check out my curated wishlist of ${wishlistedProducts.length} handmade pearl pieces from Artified Nepal!`,
          url: getWishlistShareUrl(),
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    handleCopyLink();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C1B1A]/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsWishlistOpen(false)}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#FAF8F5] dark:bg-[#141312] text-[#1C1B1A] dark:text-[#F5F2EB] h-full shadow-2xl z-10 flex flex-col justify-between border-l border-[#E8DFD8] dark:border-[#2D2B28] transition-colors duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-[#1A1918] border-b border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h2 className="font-serif text-lg font-semibold tracking-wide text-[#1C1B1A] dark:text-[#F5F2EB]">
              Saved Wishlist
            </h2>
            <span className="text-xs bg-[#FAF8F5] dark:bg-[#201F1D] text-[#8C7A6B] dark:text-[#A69E96] px-2 py-0.5 rounded-full border border-[#E8DFD8] dark:border-[#33302C]">
              {wishlistedProducts.length} pieces
            </span>
          </div>

          <div className="flex items-center gap-2">
            {wishlistedProducts.length > 0 && (
              <button
                type="button"
                onClick={() => setIsShareOpen(!isShareOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isShareOpen
                    ? 'bg-[#1C1B1A] dark:bg-[#FAF8F5] text-white dark:text-[#1C1B1A] border-[#1C1B1A] dark:border-[#FAF8F5]'
                    : 'bg-[#FAF8F5] dark:bg-[#201F1D] text-[#1C1B1A] dark:text-[#F5F2EB] border-[#E8DFD8] dark:border-[#33302C] hover:border-[#C5A880]'
                }`}
                title="Share wishlist with friends or family"
              >
                <Share2 className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Share</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsWishlistOpen(false)}
              className="p-1.5 rounded-full text-[#8C847E] hover:text-[#1C1B1A] dark:hover:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#252422] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Share Wishlist Panel */}
        {isShareOpen && wishlistedProducts.length > 0 && (
          <div className="p-4 bg-gradient-to-br from-[#24211E] via-[#1C1B1A] to-[#151413] text-white border-b border-[#3E3A36] space-y-3 animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Share Your Wishlist ({wishlistedProducts.length} pieces)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="text-[#A69E96] hover:text-white text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-[#A69E96] leading-relaxed">
              Send your curated selection of handmade pearl bags and chokers directly to friends, bridesmaids, or family via WhatsApp or copyable link.
            </p>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#20ba59] to-[#25D366] hover:brightness-105 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white border border-white/20 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#D4AF37]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Shareable Link Input with one-tap copy */}
            <div className="flex items-center gap-2 bg-[#121110] p-1.5 rounded-xl border border-[#3E3A36]">
              <input
                type="text"
                readOnly
                value={getWishlistShareUrl()}
                className="flex-1 bg-transparent px-2 text-[11px] text-[#C5A880] font-mono focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#c49f2c] text-[#1C1B1A] font-bold text-[10px] uppercase rounded-lg transition-all shrink-0 cursor-pointer"
              >
                {isCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {/* Multi-Device Cloud Wishlist Sync Status Banner */}
          {isUserLoggedIn && currentUser ? (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-[#FAF8F5] to-emerald-50 dark:from-emerald-950/40 dark:via-[#1A1918] dark:to-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-200 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-600/15 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[11px] text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                    <span>☁️ Cloud Synced Across Devices</span>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
                  </p>
                  <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80 truncate">
                    Saved to {currentUser.email || currentUser.displayName || 'Google Account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logoutUser}
                className="text-[10px] text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 underline ml-2 shrink-0 cursor-pointer"
                title="Sign out of this device"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FAF8F5] via-amber-50/50 to-[#FAF8F5] dark:from-[#181716] dark:via-amber-950/20 dark:to-[#181716] border border-[#D4AF37]/50 shadow-2xs space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#997B24] dark:text-[#E6CA9E] shrink-0 mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-xs text-[#1C1B1A] dark:text-[#F5F2EB]">
                    Preserve your wishlist across devices
                  </p>
                  <p className="text-[11px] text-[#736C65] dark:text-[#A69E96] leading-relaxed mt-0.5">
                    Sign in with Google to access your saved pieces seamlessly on your phone, laptop & tablet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full py-2 px-3 bg-white dark:bg-[#201F1D] hover:bg-stone-50 dark:hover:bg-[#282724] text-[#1C1B1A] dark:text-[#F5F2EB] border border-[#D1D5DB] dark:border-[#33302C] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google to Sync'}</span>
              </button>
            </div>
          )}

          {wishlistedProducts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-[#1A1918] border border-[#E8DFD8] dark:border-[#2D2B28] flex items-center justify-center mx-auto mb-4 text-[#C5A880]">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-lg text-[#1C1B1A] dark:text-[#F5F2EB] font-medium mb-1">
                Your wishlist is empty
              </h3>
              <p className="text-xs text-[#736C65] dark:text-[#A69E96] max-w-xs mx-auto mb-6">
                Tap the heart on any pearl bag, choker, or macrame design to save your favorites here.
              </p>
              <button
                type="button"
                onClick={() => setIsWishlistOpen(false)}
                className="px-6 py-2.5 bg-[#1C1B1A] dark:bg-[#FAF8F5] text-white dark:text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#34312F] dark:hover:bg-white transition-colors cursor-pointer"
              >
                Browse Creations
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlistedProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-3.5 bg-white dark:bg-[#181716] rounded-xl border border-[#E8DFD8] dark:border-[#2D2B28] flex gap-3.5 shadow-2xs"
                >
                  <div 
                    onClick={() => {
                      setIsWishlistOpen(false);
                      setQuickViewProduct(product);
                    }}
                    className="w-20 h-24 rounded-lg overflow-hidden bg-[#FAF8F5] dark:bg-[#201F1D] shrink-0 border border-[#F0EBE5] dark:border-[#33302C] cursor-pointer"
                  >
                    <img
                      src={getRealProductImage(product.title, product.images[0])}
                      alt={product.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = CAVIAR_PEARL_BAG_IMAGE;
                      }}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 
                          onClick={() => {
                            setIsWishlistOpen(false);
                            setQuickViewProduct(product);
                          }}
                          className="font-serif text-sm font-medium text-[#1C1B1A] dark:text-[#F5F2EB] leading-snug line-clamp-1 cursor-pointer hover:text-[#C5A880] dark:hover:text-[#E6CA9E]"
                        >
                          {product.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(product.id)}
                          className="text-[#A69E96] hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F5F2EB] mt-0.5">
                        Rs. {product.price.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[#8C7A6B] dark:text-[#A69E96] capitalize">
                        {product.category.replace('-', ' ')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#F0EBE5] dark:border-[#262422]">
                      <button
                        type="button"
                        onClick={() => handleMoveToCart(product)}
                        className="w-full py-1.5 px-3 bg-[#1C1B1A] dark:bg-[#FAF8F5] hover:bg-[#34312F] dark:hover:bg-white text-white dark:text-[#1C1B1A] rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Move to Bag</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {wishlistedProducts.length > 0 && (
          <div className="p-4 bg-white dark:bg-[#1A1918] border-t border-[#E8DFD8] dark:border-[#2D2B28]">
            <button
              type="button"
              onClick={() => {
                wishlistedProducts.forEach((p) => addToCart(p, 1));
                setIsWishlistOpen(false);
              }}
              className="w-full py-3 bg-[#1C1B1A] hover:bg-black dark:bg-[#FAF8F5] dark:hover:bg-white text-white dark:text-[#1C1B1A] rounded-xl text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Move All to Bag</span>
              <ArrowRight className="w-4 h-4 text-[#C5A880]" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
