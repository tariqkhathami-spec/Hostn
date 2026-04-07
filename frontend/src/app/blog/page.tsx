'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { blogApi } from '@/lib/api';
import { BlogPost, BlogCategory } from '@/types';
import { Calendar, ArrowRight, Loader2, BookOpen } from 'lucide-react';

export default function BlogPage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, catsRes] = await Promise.allSettled([
          blogApi.getPosts({ published: true }),
          blogApi.getCategories(),
        ]);
        if (postsRes.status === 'fulfilled') setPosts(postsRes.value.data.data || postsRes.value.data || []);
        if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data.data || catsRes.value.data || []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPosts = activeCategory
    ? posts.filter(p => {
        const catId = typeof p.category === 'string' ? p.category : p.category?._id;
        return catId === activeCategory;
      })
    : posts;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        {/* Hero */}
        <div className="bg-primary-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {isAr ? '\u0645\u062F\u0648\u0646\u0629 Hostn' : 'Hostn Blog'}
            </h1>
            <p className="text-primary-200 text-lg max-w-2xl mx-auto">
              {isAr
                ? '\u0646\u0635\u0627\u0626\u062D \u0633\u0641\u0631\u060C \u0623\u062F\u0644\u0629 \u0645\u062F\u0646\u060C \u0648\u0622\u062E\u0631 \u0623\u062E\u0628\u0627\u0631 \u0627\u0644\u0636\u064A\u0627\u0641\u0629 \u0641\u064A \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629'
                : 'Travel tips, city guides, and the latest hospitality news in Saudi Arabia'}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Category tabs */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !activeCategory ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {isAr ? '\u0627\u0644\u0643\u0644' : 'All'}
              </button>
              {categories.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => setActiveCategory(cat._id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat._id ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat.name[lang]}
                </button>
              ))}
            </div>
          )}

          {/* Posts grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">{isAr ? '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0642\u0627\u0644\u0627\u062A \u0628\u0639\u062F' : 'No posts yet'}</p>
              <p className="text-sm text-gray-400 mt-1">{isAr ? '\u062A\u0631\u0642\u0628\u0648\u0627 \u0645\u062D\u062A\u0648\u0649 \u062C\u062F\u064A\u062F \u0642\u0631\u064A\u0628\u0627\u064B' : 'Stay tuned for new content'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => {
                const cat = typeof post.category === 'object' ? post.category : null;
                return (
                  <Link key={post._id} href={`/blog/${post.slug}`} className="group">
                    <article className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      {post.coverImage ? (
                        <div className="aspect-[16/9] relative overflow-hidden">
                          <Image
                            src={post.coverImage}
                            alt={post.title[lang]}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                          {cat && (
                            <span className="absolute top-3 ltr:left-3 rtl:right-3 bg-primary-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                              {cat.name[lang]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[16/9] bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-primary-300" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.publishedAt || post.createdAt)}
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {post.title[lang]}
                        </h2>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                          {post.excerpt[lang]}
                        </p>
                        <span className="text-sm font-medium text-primary-600 flex items-center gap-1">
                          {isAr ? '\u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0632\u064A\u062F' : 'Read more'}
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </span>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
