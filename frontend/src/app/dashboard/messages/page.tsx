'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { messagesApi } from '@/lib/api';
import { Conversation, Message, User } from '@/types';
import { MessageSquare, Search, Send, ArrowLeft, Ban, MoreVertical, AlertCircle, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

function timeAgo(dateStr: string, isAr: boolean) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isAr ? 'الآن' : 'Just now';
  if (mins < 60) return isAr ? `${mins} د` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isAr ? `${hrs} س` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return isAr ? `${days} ي` : `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(isAr ? 'ar-u-nu-latn' : undefined);
}

function GuestMessagesContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoOpenedRef = useRef(false);

  // Dismiss menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/messages');
  }, [isAuthenticated, isLoading, router]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await messagesApi.getConversations();
      setConversations(res.data.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  // Auto-open conversation when navigated from property page with ?host=&property= params
  useEffect(() => {
    if (!isAuthenticated || autoOpenedRef.current) return;
    const hostId = searchParams.get('host');
    if (!hostId) return;
    autoOpenedRef.current = true;
    const propertyId = searchParams.get('property') || undefined;

    (async () => {
      try {
        const res = await messagesApi.createConversation({ recipientId: hostId, propertyId });
        const conv = res.data.data;
        if (conv?._id) {
          await loadConversations();
          selectConversation(conv._id);
        }
      } catch {
        toast.error(isAr ? 'فشل فتح المحادثة' : 'Failed to open conversation');
        await loadConversations();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, searchParams]);

  useEffect(() => {
    if (isAuthenticated && !autoOpenedRef.current) {
      loadConversations();
    }
    if (isAuthenticated) {
      const t = setInterval(loadConversations, 10000);
      return () => clearInterval(t);
    }
  }, [isAuthenticated, loadConversations]);

  const selectConversation = async (id: string) => {
    setSelectedId(id);
    setMsgLoading(true);
    setShowMenu(false);
    try {
      const res = await messagesApi.getMessages(id, { limit: 50 });
      setMessages(res.data.data || []);
      loadConversations();
    } catch { toast.error(isAr ? 'فشل تحميل الرسائل' : 'Failed to load messages'); }
    finally { setMsgLoading(false); }
  };

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(async () => {
      try {
        const res = await messagesApi.getMessages(selectedId, { limit: 50 });
        setMessages(res.data.data || []);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await messagesApi.sendMessage(selectedId, { content: newMessage.trim() });
      setNewMessage('');
      const res = await messagesApi.getMessages(selectedId, { limit: 50 });
      setMessages(res.data.data || []);
      loadConversations();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (isAr ? 'فشل الإرسال' : 'Failed to send');
      toast.error(msg);
    } finally { setSending(false); }
  };

  const handleBlock = async () => {
    if (!selectedId) return;
    try {
      const res = await messagesApi.toggleBlock(selectedId);
      toast.success(res.data.message);
      loadConversations();
      setShowMenu(false);
    } catch { toast.error(isAr ? 'فشل الإجراء' : 'Action failed'); }
  };

  const handleReport = () => {
    toast.success(isAr ? 'تم إرسال البلاغ للدعم' : 'Report sent to support');
    setShowMenu(false);
  };

  const selectedConv = conversations.find(c => c._id === selectedId);
  const getOtherParticipant = (conv: Conversation): User | null => {
    if (!user) return null;
    const other = conv.participants.find(p => {
      const pId = typeof p === 'string' ? p : p._id;
      return pId !== user._id;
    });
    return other && typeof other !== 'string' ? other : null;
  };
  const getUnread = (conv: Conversation): number => user ? (conv.unreadCount?.[user._id] || 0) : 0;

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const other = getOtherParticipant(c);
    return other?.name?.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{isAr ? 'الرسائل' : 'Messages'}</h1>
          <p className="text-sm text-gray-500 mt-1">{isAr ? 'تحدث مع المضيفين بشأن حجوزاتك' : 'Chat with hosts about your bookings'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Conversation List */}
            <div className={`border-r border-gray-100 flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm text-gray-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : filtered.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <div>
                      <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">{isAr ? 'لا توجد محادثات بعد' : 'No conversations yet'}</p>
                      <p className="text-xs text-gray-400 mt-1">{isAr ? 'ابدأ محادثة من صفحة العقار' : 'Start a conversation from a property page'}</p>
                    </div>
                  </div>
                ) : filtered.map(conv => {
                  const other = getOtherParticipant(conv);
                  const unread = getUnread(conv);
                  return (
                    <button key={conv._id} onClick={() => selectConversation(conv._id)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition text-left border-b border-gray-50 ${selectedId === conv._id ? 'bg-primary-50' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                        {other?.avatar ? (
                          <Image src={other.avatar} alt="" width={40} height={40} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium text-sm">{other?.name?.charAt(0) || '?'}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{other?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">{conv.lastMessage?.timestamp ? timeAgo(conv.lastMessage.timestamp, isAr) : ''}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{conv.lastMessage?.content || (isAr ? 'لا رسائل بعد' : 'No messages yet')}</p>
                          {unread > 0 && <span className="ml-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{unread > 9 ? '9+' : unread}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`col-span-2 flex flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
              {!selectedId ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center bg-gray-50/50">
                  <div>
                    <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">{isAr ? 'اختر محادثة' : 'Select a conversation'}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <button onClick={() => setSelectedId(null)} className="md:hidden text-gray-500"><ArrowLeft className="w-5 h-5 rtl:rotate-180" /></button>
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {getOtherParticipant(selectedConv!)?.avatar ? (
                        <Image src={getOtherParticipant(selectedConv!)!.avatar!} alt="" width={36} height={36} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium text-sm">{getOtherParticipant(selectedConv!)?.name?.charAt(0) || '?'}</div>
                      )}
                    </div>
                    <div className="flex-1"><p className="text-sm font-semibold text-gray-900">{getOtherParticipant(selectedConv!)?.name || 'Unknown'}</p></div>
                    <div className="relative" ref={menuRef}>
                      <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-4 h-4 text-gray-500" /></button>
                      {showMenu && (
                        <div className="absolute end-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                          <button onClick={handleReport} className="w-full px-4 py-2.5 text-start text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                            <Flag className="w-4 h-4" />{isAr ? '\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645' : 'Report User'}
                          </button>
                          <button onClick={handleBlock} className="w-full px-4 py-2.5 text-start text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
                            <Ban className="w-4 h-4" />{selectedConv?.isBlocked ? (isAr ? '\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631' : 'Unblock') : (isAr ? '\u062D\u0638\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645' : 'Block User')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                    {msgLoading ? <div className="text-center text-sm text-gray-400 py-10">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
                    : messages.length === 0 ? <div className="text-center text-sm text-gray-400 py-10">{isAr ? 'لا رسائل بعد' : 'No messages yet'}</div>
                    : messages.map(msg => {
                      const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
                      const isMe = senderId === user?._id;
                      return (
                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            msg.messageType === 'system' ? 'bg-gray-100 text-gray-500 text-center mx-auto text-xs'
                            : isMe ? 'bg-primary-500 text-white rounded-br-md' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString(isAr ? 'ar-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>

                  {selectedConv?.isBlocked ? (
                    <div className="p-4 border-t border-gray-100 bg-red-50 flex items-center gap-2 justify-center text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" /> {isAr ? 'هذه المحادثة محظورة' : 'This conversation is blocked'}
                    </div>
                  ) : (
                    <div className="p-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                          placeholder={isAr ? 'اكتب رسالة...' : 'Type a message...'} disabled={sending}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                        <button onClick={handleSend} disabled={!newMessage.trim() || sending}
                          className="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 transition">
                          <Send className="w-4 h-4 rtl:-scale-x-100" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

export default function GuestMessagesPage() {
  return (
    <Suspense fallback={null}>
      <GuestMessagesContent />
    </Suspense>
  );
}
