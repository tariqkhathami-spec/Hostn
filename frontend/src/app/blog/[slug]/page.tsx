'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { blogApi } from '@/lib/api';
import { BlogPost, BlogCategory, User } from '@/types';
import { Calendar, ArrowLeft, Loader2, Tag } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await blogApi.getPost(slug);
        setPost(res.data.data || res.data);
      } catch {
        // 404
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : !post ? (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-bold text-gray-700 mb-2">{isAr ? '\u0627\u0644\u0645\u0642\u0627\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F' : 'Post not found'}</h1>
            <Link href="/blog" className="text-primary-600 hover:underline mt-4 inline-block">
              <ArrowLeft className="w-4 h-4 inline rtl:rotate-180" /> {isAr ? '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0645\u062F\u0648\u0646\u0629' : 'Back to blog'}
            </Link>
          </div>
        ) : (
          <>
            {/* Cover */}
            {post.coverImage && (
              <div className="relative h-[300px] md:h-[400px] bg-gray-100">
                <Image src={post.coverImage} alt={post.title[lang]} fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}

            <div className="max-w-3xl mx-auto px-4 py-10">
              {/* Back */}
              <Link href="/blog" className="text-sm text-gray-400 hover:text-primary-600 flex items-center gap-1 mb-6">
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                {isAr ? '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0645\u062F\u0648\u0646\u0629' : 'Back to blog'}
              </Link>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
                {typeof post.category === 'object' && post.category && (
                  <span className="bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {(post.category as BlogCategory).name[lang]}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(post.publishedAt || post.createdAt)}
                </span>
                {typeof post.author === 'object' && post.author && (
                  <span>{(post.author as User).name}</span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {post.title[lang]}
              </h1>

              {/* Excerpt */}
              {post.excerpt[lang] && (
                <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                  {post.excerpt[lang]}
                </p>
              )}

              {/* Content */}
              <div
                className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: post.content[lang] }}
              />

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-gray-100">
                  <Tag className="w-4 h-4 text-gray-400" />
                  {post.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
