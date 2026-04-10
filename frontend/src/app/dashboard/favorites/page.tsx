'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { wishlistsApi } from '@/lib/api';
import { WishlistList } from '@/types';
import { Heart, Loader2, Plus, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'المفضلة' : 'Favorites');

  const [lists, setLists] = useState<WishlistList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Translate the default list name based on current language
  const getDisplayName = (list: WishlistList) => {
    if (list.isDefault) {
      return isAr ? 'مفضلاتي' : 'My Favorites';
    }
    return list.name;
  };

  // Click-outside handler to dismiss the 3-dot menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchLists = async () => {
      try {
        const res = await wishlistsApi.getLists();
        setLists(res.data.data || []);
      } catch {
        setLists([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, [isAuthenticated]);

  const handleCreate = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const res = await wishlistsApi.createList(newListName.trim());
      setLists((prev) => [...prev, { ...res.data.data, propertyCount: 0, coverImage: null }]);
      setNewListName('');
      setShowCreate(false);
      toast.success(isAr ? 'تم إنشاء القائمة' : 'List created');
    } catch {
      toast.error(isAr ? 'فشل في إنشاء القائمة' : 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (listId: string) => {
    try {
      await wishlistsApi.deleteList(listId);
      setLists((prev) => prev.filter((l) => l._id !== listId));
      toast.success(isAr ? 'تم حذف القائمة' : 'List deleted');
    } catch {
      toast.error(isAr ? 'فشل في حذف القائمة' : 'Failed to delete list');
    }
    setMenuOpen(null);
  };

  const handleRename = async (listId: string) => {
    if (!renameValue.trim()) return;
    try {
      await wishlistsApi.updateList(listId, renameValue.trim());
      setLists((prev) =>
        prev.map((l) => (l._id === listId ? { ...l, name: renameValue.trim() } : l))
      );
      setRenaming(null);
      toast.success(isAr ? 'تم تعديل الاسم' : 'List renamed');
    } catch {
      toast.error(isAr ? 'فشل في تعديل الاسم' : 'Failed to rename');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAr ? 'قوائم المفضلة' : 'Favorites'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAr ? 'نظّم عقاراتك المفضلة في قوائم' : 'Organize your favorite properties into lists'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isAr ? 'قائمة جديدة' : 'New List'}
        </button>
      </div>

      {/* Create list inline */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder={isAr ? 'اسم القائمة الجديدة' : 'New list name'}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newListName.trim()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : isAr ? 'إنشاء' : 'Create'}
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewListName(''); }}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : lists.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">
            {isAr ? 'لم تحفظ أي عقارات بعد' : 'You haven\'t saved any properties yet'}
          </p>
          <Link
            href="/search"
            className="inline-block bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {isAr ? 'تصفح العقارات' : 'Browse Properties'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <div key={list._id} className="relative group">
              {/* Menu for non-default lists */}
              {!list.isDefault && (
                <div className="absolute top-3 ltr:right-3 rtl:left-3 z-10" ref={menuOpen === list._id ? menuRef : undefined}>
                  <button
                    onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === list._id ? null : list._id); }}
                    className="p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                  {menuOpen === list._id && (
                    <div className="absolute top-10 ltr:right-0 rtl:left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setRenaming(list._id);
                          setRenameValue(list.name);
                          setMenuOpen(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {isAr ? 'إعادة تسمية' : 'Rename'}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDelete(list._id); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isAr ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Link href={`/dashboard/favorites/${list._id}`}>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  {/* Cover image */}
                  <div className="relative h-40 bg-gradient-to-br from-primary-100 to-primary-50">
                    {list.coverImage ? (
                      <Image
                        src={list.coverImage}
                        alt={getDisplayName(list)}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Heart className="w-10 h-10 text-primary-300" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    {renaming === list._id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(list._id); if (e.key === 'Escape') setRenaming(null); }}
                        />
                        <button onClick={() => handleRename(list._id)} className="text-primary-600 text-sm font-medium">
                          {isAr ? 'حفظ' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900">{getDisplayName(list)}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {list.propertyCount} {isAr ? 'عقار' : list.propertyCount === 1 ? 'property' : 'properties'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
