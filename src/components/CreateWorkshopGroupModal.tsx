import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Award, 
  Calendar, 
  MapPin, 
  Users, 
  MessageCircle, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2,
  Wand2,
  Layers,
  BookOpen
} from 'lucide-react';
import { WorkshopGroup } from '../types';
import { autoGenerateWorkshopGroup } from '../utils/workshopAIGenerator';
import { saveWorkshopGroup, deleteWorkshopGroup } from '../data/workshops';

interface CreateWorkshopGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupSaved: (group: WorkshopGroup) => void;
  onGroupDeleted?: (groupId: string, groupKey?: string) => void;
  editingGroup?: WorkshopGroup | null;
}

export const CreateWorkshopGroupModal: React.FC<CreateWorkshopGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupSaved,
  onGroupDeleted,
  editingGroup
}) => {
  const isEditing = !!editingGroup;
  const [topicInput, setTopicInput] = useState('');
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('Masterclass • Special Cohort');
  const [date, setDate] = useState('October 2026');
  const [location, setLocation] = useState('Kathmandu, Nepal');
  const [instructor, setInstructor] = useState('Sahina Shrestha');
  const [attendeesCount, setAttendeesCount] = useState<number>(15);
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [techniques, setTechniques] = useState<string[]>(['Material Tensioning', 'Core Assembly', 'Finishing']);
  const [newTechniqueInput, setNewTechniqueInput] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (editingGroup) {
      setTitle(editingGroup.title);
      setBadge(editingGroup.badge || 'Masterclass • Special Cohort');
      setDate(editingGroup.date || 'October 2026');
      setLocation(editingGroup.location || 'Kathmandu, Nepal');
      setInstructor(editingGroup.instructor || 'Sahina Shrestha');
      setAttendeesCount(editingGroup.attendeesCount || 15);
      setTagline(editingGroup.tagline || '');
      setDescription(editingGroup.description || '');
      setTechniques(editingGroup.keyTechniques || ['Material Tensioning', 'Core Assembly']);
      setWhatsappMessage(editingGroup.whatsappMessage || '');
      setTopicInput(editingGroup.title);
    } else {
      setTitle('');
      setBadge('Masterclass • Special Cohort');
      setDate('October 2026');
      setLocation('Kathmandu, Nepal');
      setInstructor('Sahina Shrestha');
      setAttendeesCount(15);
      setTagline('Hands-On Practical Training');
      setDescription('');
      setTechniques(['Material Tensioning', 'Core Assembly', 'Finishing Knots']);
      setWhatsappMessage('');
      setTopicInput('');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmDelete(false);
  }, [editingGroup, isOpen]);

  if (!isOpen) return null;

  // Auto-Fetch & Generate Workshop Notes / Syllabus using Smart Atelier AI
  const handleAutoGenerate = () => {
    const raw = topicInput.trim() || title.trim() || 'Handcrafted Wearable Art';
    setIsGenerating(true);
    setErrorMsg(null);

    setTimeout(() => {
      const generated = autoGenerateWorkshopGroup(raw);
      setTitle(generated.title);
      setBadge(generated.badge);
      setTagline(generated.tagline);
      setDescription(generated.description);
      setTechniques(generated.keyTechniques);
      setAttendeesCount(generated.suggestedAttendees);
      setLocation(generated.location);
      setInstructor(generated.instructor);
      setWhatsappMessage(generated.whatsappMessage);
      setIsGenerating(false);
      setSuccessMsg('Workshop notes and syllabus auto-generated successfully!');
      setTimeout(() => setSuccessMsg(null), 2500);
    }, 400);
  };

  const handleAddTechnique = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newTechniqueInput.trim()) return;
    if (!techniques.includes(newTechniqueInput.trim())) {
      setTechniques([...techniques, newTechniqueInput.trim()]);
    }
    setNewTechniqueInput('');
  };

  const handleRemoveTechnique = (idxToRemove: number) => {
    setTechniques(techniques.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter a workshop title.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please write or auto-generate a brief workshop description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const slugKey = editingGroup?.groupKey || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `ws-${Date.now()}`;
      
      const newGroup: WorkshopGroup = {
        id: editingGroup?.id || `group_${Date.now()}`,
        groupKey: slugKey,
        title: title.trim(),
        badge: badge.trim() || 'Masterclass • Kathmandu Atelier',
        date: date.trim() || 'October 2026',
        location: location.trim() || 'Kathmandu, Nepal',
        instructor: instructor.trim() || 'Sahina Shrestha',
        attendeesCount: Number(attendeesCount) || 15,
        tagline: tagline.trim() || 'Hands-On Practical Training',
        description: description.trim(),
        keyTechniques: techniques.length > 0 ? techniques : ['Handcrafting Mentorship'],
        items: editingGroup?.items || [],
        whatsappMessage: whatsappMessage.trim() || `Namaste Sahina! I would like to join the ${title} in Kathmandu.`
      };

      await saveWorkshopGroup(newGroup);
      onGroupSaved(newGroup);

      setSuccessMsg(isEditing ? 'Masterclass updated successfully!' : 'New Workshop Masterclass created successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save workshop group:', err);
      setErrorMsg(err.message || 'Failed to save workshop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingGroup) return;
    setIsSubmitting(true);
    try {
      await deleteWorkshopGroup(editingGroup.id, editingGroup.groupKey);
      if (onGroupDeleted) {
        onGroupDeleted(editingGroup.id, editingGroup.groupKey);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete workshop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1918] rounded-3xl shadow-2xl border border-[#E8DFD8] dark:border-[#2E2C29] p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EBE5] dark:border-[#262422] mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#C5A880]/15 text-[#C5A880]">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1C1B1A] dark:text-[#FAF8F5]">
                {isEditing ? 'Edit Workshop Masterclass' : 'Create New Workshop Masterclass from Scratch'}
              </h3>
              <p className="text-xs text-[#736C65] dark:text-[#9E9790]">
                Define syllabus, techniques, cohort size, and auto-fetch rich atelier notes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#736C65] hover:text-[#1C1B1A] dark:text-[#9E9790] dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-900/40">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auto-Fetch & AI Generator Tool Card */}
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#C5A880]/15 via-[#8C5D36]/10 to-[#C5A880]/15 border border-[#C5A880]/35">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C5D36] dark:text-[#E6CA9E] uppercase tracking-wider">
              <Wand2 className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Auto-Fetch & Generate Workshop Notes</span>
            </span>
            <span className="text-[10px] text-[#736C65] dark:text-[#9E9790]">
              Kathmandu Atelier AI
            </span>
          </div>

          <p className="text-[11px] text-[#5E5955] dark:text-[#C4BCB5] leading-relaxed mb-3">
            Type any craft topic (e.g. <em>"Nepali Dhaka Weaving"</em>, <em>"Resin Floral Ornaments"</em>, <em>"Macrame Wall Planters"</em>, <em>"Pearl Bridal Clutch"</em>) to auto-fill title, syllabus, techniques, and description.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="e.g. Nepali Dhaka Weaving, Macrame Hanging Lamp..."
              className="flex-grow px-3 py-2 rounded-xl bg-white dark:bg-[#121110] border border-[#E8DFD8] dark:border-[#2E2C29] text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
            />
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleAutoGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1C1B1A] dark:bg-white text-white dark:text-[#1C1B1A] text-xs font-bold uppercase tracking-wider hover:bg-[#333] transition-all cursor-pointer shrink-0 shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Auto-Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Masterclass Details Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Masterclass Title */}
          <div>
            <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
              Masterclass Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Macrame Knotting & Fiber Art Masterclass"
              required
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          {/* Badge & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                Badge / Cohort Label
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. Masterclass #04 • Heritage Fiber Art"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div>
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                Tagline / Summary
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. 15 Trainees • Limited Atelier Cohort"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>

          {/* Date, Location, Candidates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                Date / Timing
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. October 2026"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div>
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kathmandu, Nepal"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div>
              <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
                Candidates Count
              </label>
              <input
                type="number"
                value={attendeesCount}
                onChange={(e) => setAttendeesCount(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>

          {/* Description / Story */}
          <div>
            <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
              Workshop Story & Syllabus Description *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Concise, high-impact narrative explaining what candidates will master, the materials used, and why this craft is special..."
              required
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880] leading-relaxed"
            />
          </div>

          {/* Key Techniques Mastered Tag Adder */}
          <div>
            <label className="block text-[#1C1B1A] dark:text-[#FAF8F5] font-semibold mb-1">
              Core Techniques Mastered
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {techniques.map((tech, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] dark:bg-[#201E1C] border border-[#E8DFD8] dark:border-[#2E2C29] text-[11px] font-medium text-[#1C1B1A] dark:text-[#E6CA9E]"
                >
                  <span>✓ {tech}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTechnique(idx)}
                    className="hover:text-red-500 ml-1 cursor-pointer font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTechniqueInput}
                onChange={(e) => setNewTechniqueInput(e.target.value)}
                onKeyDown={handleAddTechnique}
                placeholder="Type a technique and press Enter or click Add..."
                className="flex-grow px-3 py-1.5 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-xs text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
              />
              <button
                type="button"
                onClick={handleAddTechnique}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#262422] text-[#1C1B1A] dark:text-white text-xs font-semibold cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>

          {/* WhatsApp Message Template */}
          <div>
            <label className="block text-[#736C65] dark:text-[#9E9790] font-medium mb-1">
              WhatsApp Registration Message Template
            </label>
            <input
              type="text"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="e.g. Namaste Sahina! I would like to join the..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#151413] border border-[#E8DFD8] dark:border-[#2E2C29] text-[#1C1B1A] dark:text-white focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#F0EBE5] dark:border-[#262422] flex items-center justify-between gap-3">
            <div>
              {isEditing && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-red-500 font-medium">Delete group?</span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleDelete}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Masterclass</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E8DFD8] dark:border-[#2E2C29] text-[#736C65] hover:text-[#1C1B1A] dark:text-[#9E9790] dark:hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#b8986c] text-[#1C1B1A] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>{isEditing ? 'Update Masterclass' : 'Save & Publish Masterclass'}</span>
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
