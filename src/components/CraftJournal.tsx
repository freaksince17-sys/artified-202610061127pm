import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Clock, 
  Calendar, 
  User, 
  Share2, 
  MessageCircle, 
  Check, 
  Search, 
  Tag, 
  ArrowRight, 
  X, 
  Plus, 
  Globe, 
  Edit3,
  Feather,
  ShoppingBag
} from 'lucide-react';
import { CraftArticle } from '../types';
import { getCraftArticles, saveCraftArticle } from '../data/journalArticles';
import { useCart } from '../context/CartContext';
import { CAVIAR_PEARL_BAG_IMAGE } from '../utils/productImages';

type CategoryFilter = 'All' | 'Craft Techniques' | 'Nepali Heritage' | 'Care Guides' | 'Bridal & Styling';

export const CraftJournal: React.FC = () => {
  const { isSellerMode, setQuickViewProduct, products } = useCart();

  const [articles, setArticles] = useState<CraftArticle[]>(() => getCraftArticles());
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<CraftArticle | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Publisher modal for Shop Owner
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newCategory, setNewCategory] = useState<'Craft Techniques' | 'Nepali Heritage' | 'Care Guides' | 'Bridal & Styling'>('Craft Techniques');
  const [newCoverImage, setNewCoverImage] = useState(CAVIAR_PEARL_BAG_IMAGE);
  const [newContentText, setNewContentText] = useState('');
  const [newTagsText, setNewTagsText] = useState('Pearl Weaving, Kathmandu, Handmade');
  const [newKeywordsText, setNewKeywordsText] = useState('handmade pearl bags nepal, kathmandu craft');

  useEffect(() => {
    const handleUpdate = () => {
      setArticles(getCraftArticles());
    };
    window.addEventListener('artified_articles_updated', handleUpdate);
    return () => window.removeEventListener('artified_articles_updated', handleUpdate);
  }, []);

  const filteredArticles = articles.filter((art) => {
    const matchCategory = selectedCategory === 'All' || art.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchQuery = !query || 
      art.title.toLowerCase().includes(query) ||
      art.subtitle.toLowerCase().includes(query) ||
      art.excerpt.toLowerCase().includes(query) ||
      art.tags.some((t) => t.toLowerCase().includes(query)) ||
      art.seoKeywords.some((k) => k.toLowerCase().includes(query));
    return matchCategory && matchQuery;
  });

  const handleShareArticleWhatsApp = (article: CraftArticle) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/?article=${article.slug}`;
    const message = `✨ Read this inspiring article on Nepali pearl craft & heritage: "${article.title}" by ${article.author} from Artified Nepal.\n\n${shareUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopyArticleLink = (article: CraftArticle) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/?article=${article.slug}`;
    try {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContentText.trim()) return;

    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const paragraphs = newContentText.split('\n\n').map((p) => p.trim()).filter(Boolean);
    const tags = newTagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const keywords = newKeywordsText.split(',').map((k) => k.trim()).filter(Boolean);

    const created: CraftArticle = {
      id: `art-${Date.now()}`,
      slug,
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || 'Craft Insights from Kathmandu Workshop',
      excerpt: newExcerpt.trim() || paragraphs[0]?.slice(0, 160) + '...',
      category: newCategory,
      author: 'Sahina Shrestha',
      authorRole: 'Founder and Creator',
      publishedDate: 'Just Published',
      readTime: `${Math.max(2, Math.ceil(paragraphs.join(' ').split(' ').length / 180))} min read`,
      coverImage: newCoverImage.trim() || CAVIAR_PEARL_BAG_IMAGE,
      tags: tags.length > 0 ? tags : ['Handmade', 'Nepal'],
      seoKeywords: keywords.length > 0 ? keywords : ['handmade pearl bags nepal'],
      viewsCount: 1,
      content: paragraphs.length > 0 ? paragraphs : ['New handcrafted article content published at Artified Nepal.']
    };

    saveCraftArticle(created);
    setArticles(getCraftArticles());
    setIsPublishModalOpen(false);

    // Reset fields
    setNewTitle('');
    setNewSubtitle('');
    setNewExcerpt('');
    setNewContentText('');
  };

  return (
    <section className="py-8 sm:py-12 bg-[#FAF8F5] border-t border-[#E8DFD8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8DFD8] pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C1B1A] text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
              <Feather className="w-3.5 h-3.5" />
              <span>Handcrafted Craft Journal</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1C1B1A] font-semibold tracking-tight">
              Stories of Pearl Mastery & Nepali Heritage
            </h2>
            <p className="text-xs sm:text-sm text-[#736C65] leading-relaxed">
              Explore the historical Newari bead stringing traditions, our signature 7-strand steel wire weaving techniques, and bridal pearl styling straight from our workshop in Kathmandu, Nepal.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {isSellerMode && (
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(true)}
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Write & Publish Article</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {(['All', 'Craft Techniques', 'Nepali Heritage', 'Care Guides', 'Bridal & Styling'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1C1B1A] text-white shadow-xs'
                    : 'bg-white text-[#736C65] border border-[#E8DFD8] hover:border-[#C5A880]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#8C847E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search techniques or heritage..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#1C1B1A] placeholder-[#A69E96] focus:outline-none focus:border-[#C5A880]"
            />
          </div>
        </div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8DFD8] p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-[#C5A880] mx-auto" />
            <h3 className="font-serif text-lg font-medium text-[#1C1B1A]">No articles found</h3>
            <p className="text-xs text-[#736C65] max-w-sm mx-auto">
              We couldn't find any articles matching "{searchQuery}". Try selecting another category or clear your search query.
            </p>
            <button
              type="button"
              onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
              className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] text-xs font-semibold rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, idx) => (
              <article
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="bg-white rounded-2xl border border-[#E8DFD8] hover:border-[#C5A880] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Article Cover Image with Category Tag */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#FAF8F5]">
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1C1B1A]/90 text-[#D4AF37] backdrop-blur-xs border border-[#D4AF37]/30 shadow-xs">
                        {article.category}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-3 text-[11px] text-[#8C847E]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#C5A880]" />
                        <span>{article.publishedDate}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C5A880]" />
                        <span>{article.readTime}</span>
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#1C1B1A] leading-snug group-hover:text-[#C5A880] transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-xs text-[#5E5955] leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                {/* Footer with Author & Read More */}
                <div className="px-5 pb-5 pt-2 border-t border-[#F0EBE5] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center font-bold text-[10px]">
                      SS
                    </div>
                    <span className="font-semibold text-[#1C1B1A] text-[11px]">
                      {article.author}
                    </span>
                  </div>

                  <span className="font-bold text-[#C5A880] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Read Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>

      {/* Full Article Reader Modal with Schema.org injection */}
      {activeArticle && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          {/* Schema.org BlogPosting structured data injection for SEO */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                headline: activeArticle.title,
                description: activeArticle.excerpt,
                image: activeArticle.coverImage,
                author: {
                  '@type': 'Person',
                  name: activeArticle.author,
                  jobTitle: activeArticle.authorRole
                },
                publisher: {
                  '@type': 'Organization',
                  name: 'Artified_np',
                  logo: {
                    '@type': 'ImageObject',
                    url: '/og-image.jpg'
                  }
                },
                datePublished: '2026-09-01',
                keywords: activeArticle.seoKeywords.join(', ')
              })
            }}
          />

          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-[#1C1B1A]/70 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveArticle(null)}
          />

          {/* Article Modal Body */}
          <div 
            className="relative bg-[#FAF8F5] w-full max-w-3xl rounded-3xl shadow-2xl border-2 border-[#D4AF37]/40 overflow-hidden z-10 flex flex-col max-h-[92vh] text-[#1C1B1A]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Bar */}
            <div className="p-4 bg-[#1C1B1A] text-white flex items-center justify-between border-b border-[#34312F]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#D4AF37] text-[#1C1B1A] font-bold px-2 py-0.5 rounded-full uppercase">
                  {activeArticle.category}
                </span>
                <span className="text-xs text-[#A69E96]">
                  {activeArticle.readTime}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareArticleWhatsApp(activeArticle)}
                  className="p-1.5 rounded-lg bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                  title="Share to WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyArticleLink(activeArticle)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Copy link"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="p-1.5 rounded-full text-[#A69E96] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Article Content */}
            <div className="p-5 sm:p-8 overflow-y-auto space-y-6">
              
              {/* Cover Hero */}
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[#E8DFD8] shadow-md">
                <img
                  src={activeArticle.coverImage}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2 border-b border-[#E8DFD8] pb-5">
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1C1B1A] leading-tight">
                  {activeArticle.title}
                </h1>
                <p className="text-sm sm:text-base text-[#736C65] font-serif italic">
                  {activeArticle.subtitle}
                </p>

                <div className="flex items-center justify-between pt-3 text-xs text-[#8C7A6B] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center font-bold text-xs">
                      SS
                    </div>
                    <div>
                      <p className="font-bold text-[#1C1B1A]">{activeArticle.author}</p>
                      <p className="text-[10px] text-[#8C7A6B]">{activeArticle.authorRole}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span>📍 Kathmandu, Nepal</span>
                    <span>•</span>
                    <span>{activeArticle.publishedDate}</span>
                  </div>
                </div>
              </div>

              {/* Paragraphs Body */}
              <div className="space-y-4 text-sm sm:text-base text-[#3C3835] leading-relaxed font-sans">
                {activeArticle.content.map((para, i) => (
                  <p key={i} className="leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>

              {/* SEO Organic Keywords & Search Tags */}
              <div className="p-4 rounded-xl bg-white border border-[#E8DFD8] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#8C7A6B] tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Craft Heritage Tags & SEO Indexing:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeArticle.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E8DFD8] text-[11px] font-medium text-[#1C1B1A] rounded-md">
                      #{tag}
                    </span>
                  ))}
                  {activeArticle.seoKeywords.map((kw, idx) => (
                    <span key={`kw-${idx}`} className="px-2 py-0.5 bg-amber-50 text-[10px] text-amber-900 border border-amber-200 rounded-md">
                      🔍 {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Call to Action: Shop Creation */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1C1B1A] via-[#2A2622] to-[#1C1B1A] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-serif text-base font-bold text-[#D4AF37]">
                    Experience Our Kathmandu Pearl Creations
                  </h4>
                  <p className="text-xs text-[#A69E96]">
                    Every bag and choker is handcrafted by Sahina Shrestha with a 24-hr exchange guarantee across Nepal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveArticle(null);
                    // Open product if found
                    const found = products.find((p) => p.category === 'pearl-bags');
                    if (found) setQuickViewProduct(found);
                  }}
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#c29f2e] text-[#1C1B1A] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Shop Pearl Bags</span>
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-white border-t border-[#E8DFD8] flex items-center justify-between text-xs">
              <span className="text-[#8C7A6B] text-[11px]">
                Artified Nepal Journal • All rights reserved
              </span>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="px-4 py-1.5 bg-[#FAF8F5] hover:bg-[#E8DFD8] text-[#1C1B1A] font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publisher Modal for Shop Owner / Seller */}
      {isPublishModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-5"
          role="dialog"
        >
          <div 
            className="fixed inset-0 bg-[#1C1B1A]/70 backdrop-blur-xs"
            onClick={() => setIsPublishModalOpen(false)}
          />

          <div 
            className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border-2 border-[#D4AF37]/50 p-6 space-y-4 z-10 text-[#1C1B1A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8DFD8] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#C5A880]" />
                <h3 className="font-serif text-lg font-bold">Write New Craft Journal Article</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1 rounded-full text-[#736C65] hover:text-[#1C1B1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#1C1B1A] block mb-1">Article Title:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master Weaving Techniques for Heavy Pearl Clutches"
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1B1A] block mb-1">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                  >
                    <option value="Craft Techniques">Craft Techniques</option>
                    <option value="Nepali Heritage">Nepali Heritage</option>
                    <option value="Care Guides">Care Guides</option>
                    <option value="Bridal & Styling">Bridal & Styling</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1C1B1A] block mb-1">Cover Image URL:</label>
                  <input
                    type="url"
                    value={newCoverImage}
                    onChange={(e) => setNewCoverImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1B1A] block mb-1">Subtitle / Excerpt:</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Brief compelling subtitle for readers and search snippets..."
                  className="w-full p-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1B1A] block mb-1">Article Content (Separate paragraphs with double enter):</label>
                <textarea
                  rows={6}
                  required
                  value={newContentText}
                  onChange={(e) => setNewContentText(e.target.value)}
                  placeholder="Describe the craft techniques, history, or care guide in detail..."
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1B1A] block mb-1">Tags (Comma-separated):</label>
                  <input
                    type="text"
                    value={newTagsText}
                    onChange={(e) => setNewTagsText(e.target.value)}
                    placeholder="Pearl Weaving, Kathmandu, Wedding"
                    className="w-full p-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1C1B1A] block mb-1">SEO Keywords (Comma-separated):</label>
                  <input
                    type="text"
                    value={newKeywordsText}
                    onChange={(e) => setNewKeywordsText(e.target.value)}
                    placeholder="handmade pearl bags nepal, kathmandu craft"
                    className="w-full p-2 bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl text-xs focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DFD8]">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#E8DFD8] rounded-xl font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1C1B1A] hover:bg-black text-[#D4AF37] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Publish to Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
