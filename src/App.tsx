/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { CartProvider } from './context/CartContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Navbar } from './components/Navbar';
import { MainSwipeDeck } from './components/MainSwipeDeck';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { MobileBottomBar } from './components/MobileBottomBar';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { SellerAuthModal } from './components/SellerAuthModal';
import { SellerToolbar } from './components/SellerToolbar';
import { SellerProductModal } from './components/SellerProductModal';
import { SellerCatalogListModal } from './components/SellerCatalogListModal';
import { TikTokManageModal } from './components/TikTokManageModal';
import { InstagramManageModal } from './components/InstagramManageModal';
import { CraftStoryModal } from './components/CraftStoryModal';
import { SellerReviewsModal } from './components/SellerReviewsModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { GitHubImportModal } from './components/GitHubImportModal';
import { WebsiteExportModal } from './components/WebsiteExportModal';
import { OrderProgressManagerModal } from './components/OrderProgressManagerModal';
import { CustomerAccountModal } from './components/CustomerAccountModal';
import { NewsletterSignupModal } from './components/NewsletterSignupModal';
import { RestockNotificationToast } from './components/RestockNotificationToast';
import { AddToCartToast } from './components/AddToCartToast';
import { ProductCompareModal } from './components/ProductCompareModal';
import { CompareFloatingDock } from './components/CompareFloatingDock';
import { ReferAFriendModal } from './components/ReferAFriendModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { OrderFAQsModal } from './components/OrderFAQsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useCart } from './context/CartContext';
import { useAuthPersistence } from './hooks/useAuthPersistence';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { recordVisitorHit } from './services/visitorAnalyticsService';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'An unexpected render error occurred.' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0E] text-[#1C1B1A] dark:text-[#F5F2EB] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-[#1A1918] p-8 rounded-2xl border border-[#E8DFD8] dark:border-[#2E2C29] shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-[#1C1B1A] dark:text-white mb-2">Artified_np</h2>
            <p className="text-sm text-[#736C65] dark:text-[#A8A29D] mb-6 leading-relaxed">
              We encountered a brief hiccup while rendering. You can continue browsing our catalog or reload the application.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.href = '/';
                }}
                className="w-full py-3 px-6 bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#333] dark:hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Return to Shop
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                }}
                className="w-full py-2.5 px-6 bg-neutral-100 dark:bg-neutral-800 text-[#5E5955] dark:text-[#C4BCB5] rounded-xl text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export class ModalErrorBoundary extends Component<
  { children: React.ReactNode; fallbackTitle?: string; onClose?: () => void },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode; fallbackTitle?: string; onClose?: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Error loading modal content' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ModalErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-white dark:bg-[#1C1B1A] p-6 rounded-2xl border border-[#E8DFD8] dark:border-[#333] text-center shadow-xl">
            <h3 className="font-serif text-lg font-bold text-[#1C1B1A] dark:text-white mb-2">
              {this.props.fallbackTitle || 'Studio Editor'}
            </h3>
            <p className="text-xs text-[#736C65] dark:text-[#A8A29D] mb-4">
              Unable to load editor details right now.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="px-4 py-2 rounded-xl bg-[#C5A880] text-[#1C1B1A] text-xs font-bold cursor-pointer hover:bg-[#b8986c]"
              >
                Retry
              </button>
              {this.props.onClose && (
                <button
                  type="button"
                  onClick={this.props.onClose}
                  className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  useAuthPersistence();
  const { 
    isGoogleDriveOpen, 
    setIsGoogleDriveOpen, 
    isGitHubImportOpen, 
    setIsGitHubImportOpen, 
    isWebsiteExportOpen, 
    setIsWebsiteExportOpen,
    isOrderManagerOpen,
    setIsOrderManagerOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    accountModalTab,
    isReferralOpen,
    setIsReferralOpen,
    isSizeGuideOpen,
    setIsSizeGuideOpen,
    sizeGuideDefaultTab,
    isOrderFAQsOpen,
    setIsOrderFAQsOpen,
    isMeetArtisanOpen,
    setIsMeetArtisanOpen
  } = useCart();

  // Log visitor traffic hit unobtrusively for live analytics
  React.useEffect(() => {
    recordVisitorHit().catch(() => {});
  }, []);

  return (
    <div id="top" className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0E] text-[#1C1B1A] dark:text-[#F5F2EB] flex flex-col font-sans selection:bg-[#E8DFD8] dark:selection:bg-[#33302C] selection:text-[#1C1B1A] dark:selection:text-[#FAF8F5] transition-colors duration-200">
      {/* Top Announcement Bar */}
      <AnnouncementBar />

      {/* Sticky Frosted Header */}
      <Navbar />

      {/* Main Swipeable 6-Screen Deck */}
      <main className="w-full flex-grow flex flex-col">
        <MainSwipeDeck />
      </main>

      {/* Footer */}
      <Footer />

      {/* Global Modals & Slide-over Drawers */}
      <ProductDetailModal />
      <CartDrawer />
      <CheckoutModal />
      <WishlistDrawer />
      <OrderTrackerModal />
      <CustomerAccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
        defaultTab={accountModalTab} 
      />
      <NewsletterSignupModal />
      <RestockNotificationToast />
      <AddToCartToast />
      <ProductCompareModal />
      <CompareFloatingDock />
      <ReferAFriendModal 
        isOpen={isReferralOpen} 
        onClose={() => setIsReferralOpen(false)} 
      />
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        defaultTab={sizeGuideDefaultTab}
      />
      <OrderFAQsModal
        isOpen={isOrderFAQsOpen}
        onClose={() => setIsOrderFAQsOpen(false)}
      />

      {/* Seller Mode Modals & Floating Atelier Toolbar */}
      <SellerAuthModal />
      <SellerCatalogListModal />
      <SellerProductModal />
      <TikTokManageModal />
      <InstagramManageModal />
      <CraftStoryModal />
      <SellerReviewsModal />
      <GoogleDriveSyncModal isOpen={isGoogleDriveOpen} onClose={() => setIsGoogleDriveOpen(false)} />
      <GitHubImportModal isOpen={isGitHubImportOpen} onClose={() => setIsGitHubImportOpen(false)} />
      <WebsiteExportModal isOpen={isWebsiteExportOpen} onClose={() => setIsWebsiteExportOpen(false)} />
      <OrderProgressManagerModal isOpen={isOrderManagerOpen} onClose={() => setIsOrderManagerOpen(false)} />
      <SellerToolbar />

      {/* Mobile Sticky Quick Navigation */}
      <MobileBottomBar />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

