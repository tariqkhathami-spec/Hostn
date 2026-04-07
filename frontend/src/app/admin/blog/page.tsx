'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { blogApi } from '@/lib/api';
import { BlogPost, BlogCategory } from '@/types';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, X, Save, BookOpen, FolderPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBlogPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');

  // Post form
  const [form, setForm] = useState({
    titleEn: '', titleAr: '',
    excerptEn: '', excerptAr: '',
    contentEn: '', contentAr: '',
    coverImage: '',
    category: '',
    tags: '',
    isPublished: false,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [postsRes, catsRes] = await Promise.allSettled([
        blogApi.getPosts(),
        blogApi.getCategories(),
      ]);
      if (postsRes.status === 'fulfilled') setPosts(postsRes.value.data.data || postsRes.value.data || []);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data.data || catsRes.value.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ titleEn: '', titleAr: '', excerptEn: '', excerptAr: '', contentEn: '', contentAr: '', coverImage: '', category: '', tags: '', isPublished: false });
    setEditingPost(null);
  };

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setForm({
        titleEn: post.title.en, titleAr: post.title.ar,
        excerptEn: post.excerpt.en, excerptAr: post.excerpt.ar,
        contentEn: post.content.en, contentAr: post.content.ar,
        coverImage: post.coverImage || '',
        category: typeof post.category === 'string' ? post.category : post.category?._id || '',
        tags: post.tags?.join(', ') || '',
        isPublished: post.isPublished,
      });
    } else {
      resetForm();
    }
    setShowEditor(true);
  };

  const handleSavePost = async () => {
    if (!form.titleEn && !form.titleAr) {
      toast.error(isAr ? '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628' : 'Title is required');
      return;
    }
    setSaving(true);
    const payload = {
      title: { en: form.titleEn, ar: form.titleAr },
      excerpt: { en: form.excerptEn, ar: form.excerptAr },
      content: { en: form.contentEn, ar: form.contentAr },
      coverImage: form.coverImage || undefined,
      category: form.category || undefined,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      isPublished: form.isPublished,
    };
    try {
      if (editingPost) {
        await blogApi.updatePost(editingPost._id, payload);
        toast.success(isAr ? '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0642\u0627\u0644' : 'Post updated');
      } else {
        await blogApi.createPost(payload);
        toast.success(isAr ? '\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Post created');
      }
      setShowEditor(false);
      resetForm();
      loadData();
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062D\u0641\u0638' : 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm(isAr ? '\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0642\u0627\u0644\u061F' : 'Are you sure you want to delete this post?')) return;
    try {
      await blogApi.deletePost(id);
      toast.success(isAr ? '\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Post deleted');
      loadData();
    } catch { toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062D\u0630\u0641' : 'Failed to delete'); }
  };

  const handleCreateCategory = async () => {
    if (!catNameEn && !catNameAr) return;
    try {
      await blogApi.createCategory({ name: { en: catNameEn, ar: catNameAr } });
      toast.success(isAr ? '\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0635\u0646\u064A\u0641' : 'Category created');
      setCatNameEn(''); setCatNameAr(''); setShowCatForm(false);
      loadData();
    } catch { toast.error(isAr ? '\u0641\u0634\u0644' : 'Failed'); }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400';

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062F\u0648\u0646\u0629' : 'Blog Management'}</h1>
          <p className="text-sm text-gray-500 mt-1">{isAr ? '\u0625\u0646\u0634\u0627\u0621 \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A \u0648\u0627\u0644\u062A\u0635\u0646\u064A\u0641\u0627\u062A' : 'Create and manage posts and categories'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCatForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <FolderPlus className="w-4 h-4" />
            {isAr ? '\u062A\u0635\u0646\u064A\u0641' : 'Category'}
          </button>
          <button onClick={() => openEditor()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />
            {isAr ? '\u0645\u0642\u0627\u0644 \u062C\u062F\u064A\u062F' : 'New Post'}
          </button>
        </div>
      </div>

      {/* Categories row */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <span key={cat._id} className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              {cat.name[lang]}
              <button onClick={async () => { await blogApi.deleteCategory(cat._id); loadData(); }} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Posts table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {posts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>{isAr ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0642\u0627\u0644\u0627\u062A \u0628\u0639\u062F' : 'No posts yet'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map(post => {
              const cat = typeof post.category === 'object' ? post.category : null;
              return (
                <div key={post._id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{post.title[lang] || post.title.en}</h3>
                      {post.isPublished ? (
                        <span className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full"><Eye className="w-2.5 h-2.5" /> {isAr ? '\u0645\u0646\u0634\u0648\u0631' : 'Published'}</span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full"><EyeOff className="w-2.5 h-2.5" /> {isAr ? '\u0645\u0633\u0648\u062F\u0629' : 'Draft'}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      {cat && <span>{cat.name[lang]}</span>}
                      <span>{new Date(post.createdAt).toLocaleDateString('en')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditor(post)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDeletePost(post._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category form modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{isAr ? '\u062A\u0635\u0646\u064A\u0641 \u062C\u062F\u064A\u062F' : 'New Category'}</h3>
              <button onClick={() => setShowCatForm(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={catNameEn} onChange={e => setCatNameEn(e.target.value)} placeholder="Category name (English)" className={inputClass} />
              <input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} placeholder="\u0627\u0633\u0645 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 (\u0639\u0631\u0628\u064A)" className={inputClass} dir="rtl" />
              <button onClick={handleCreateCategory} className="w-full py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
                {isAr ? '\u0625\u0646\u0634\u0627\u0621' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{editingPost ? (isAr ? '\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Edit Post') : (isAr ? '\u0645\u0642\u0627\u0644 \u062C\u062F\u064A\u062F' : 'New Post')}</h3>
              <button onClick={() => { setShowEditor(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pe-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title (English)</label>
                  <input value={form.titleEn} onChange={e => setForm({...form, titleEn: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{'\u0627\u0644\u0639\u0646\u0648\u0627\u0646 (\u0639\u0631\u0628\u064A)'}</label>
                  <input value={form.titleAr} onChange={e => setForm({...form, titleAr: e.target.value})} className={inputClass} dir="rtl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Excerpt (English)</label>
                  <textarea value={form.excerptEn} onChange={e => setForm({...form, excerptEn: e.target.value})} rows={2} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{'\u0627\u0644\u0645\u0644\u062E\u0635 (\u0639\u0631\u0628\u064A)'}</label>
                  <textarea value={form.excerptAr} onChange={e => setForm({...form, excerptAr: e.target.value})} rows={2} className={inputClass} dir="rtl" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Content (English) — HTML supported</label>
                <textarea value={form.contentEn} onChange={e => setForm({...form, contentEn: e.target.value})} rows={6} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{'\u0627\u0644\u0645\u062D\u062A\u0648\u0649 (\u0639\u0631\u0628\u064A) \u2014 \u064A\u062F\u0639\u0645 HTML'}</label>
                <textarea value={form.contentAr} onChange={e => setForm({...form, contentAr: e.target.value})} rows={6} className={inputClass} dir="rtl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cover Image URL</label>
                  <input value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} placeholder="https://..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{isAr ? '\u0627\u0644\u062A\u0635\u0646\u064A\u0641' : 'Category'}</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputClass}>
                    <option value="">{isAr ? '\u0628\u062F\u0648\u0646 \u062A\u0635\u0646\u064A\u0641' : 'No category'}</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name[lang]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{isAr ? '\u0627\u0644\u0648\u0633\u0648\u0645 (\u0645\u0641\u0635\u0648\u0644\u0629 \u0628\u0641\u0648\u0627\u0635\u0644)' : 'Tags (comma-separated)'}</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="travel, saudi, tips" className={inputClass} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={e => setForm({...form, isPublished: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">{isAr ? '\u0646\u0634\u0631 \u0627\u0644\u0645\u0642\u0627\u0644' : 'Publish post'}</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowEditor(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                {isAr ? '\u0625\u0644\u063A\u0627\u0621' : 'Cancel'}
              </button>
              <button onClick={handleSavePost} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAr ? '\u062D\u0641\u0638' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
