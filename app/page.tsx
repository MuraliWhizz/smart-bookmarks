'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trash2, 
  Plus, 
  LogOut, 
  Search, 
  ExternalLink, 
  Loader2, 
  Bookmark as BookmarkIcon,
  Globe,
  Zap,
  Menu
} from 'lucide-react'

// --- Types ---
type Bookmark = {
  id: string
  title: string
  url: string
  created_at?: string
  user_id?: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔹 Check User Session on Mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        fetchBookmarks(session.user.id)
      } else {
        setIsLoading(false)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setBookmarks([])
        setIsLoading(false)
      } else if (session?.user) {
        setUser(session.user)
        // If we just logged in, fetch bookmarks
        if (!user) fetchBookmarks(session.user.id)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [user])

  // BroadcastChannel for Tab Sync
  const bcRef = useRef<BroadcastChannel | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    bcRef.current = new BroadcastChannel('bookmarks_channel')
    bcRef.current.onmessage = (ev) => {
      if (ev.data?.type === 'refresh' && user) fetchBookmarks(user.id)
    }
    return () => {
      bcRef.current?.close()
      bcRef.current = null
    }
  }, [user])

  // Fetch Bookmarks
  const fetchBookmarks = async (userId: string) => {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) setBookmarks(data)
    setIsLoading(false)
  }

  // Add Bookmark
  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !url || !user) return
    
    setIsSubmitting(true)

    let formattedUrl = url.trim()
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl
    }

    const tempId = Math.random().toString(36).substring(7)
    const newBookmark: Bookmark = { id: tempId, title, url: formattedUrl, user_id: user.id }
    
    setBookmarks((prev) => [newBookmark, ...prev])
    setTitle('')
    setUrl('')

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([{ title, url: formattedUrl, user_id: user.id }])
      .select()

    if (error) {
      console.error('Error adding:', error)
      setBookmarks((prev) => prev.filter(b => b.id !== tempId))
    } else if (data) {
      setBookmarks((prev) => prev.map(b => b.id === tempId ? data[0] : b))
      bcRef.current?.postMessage({ type: 'refresh' })
    }
    
    setIsSubmitting(false)
  }

  //  Delete Bookmark
  const deleteBookmark = async (id: string) => {
    const previousBookmarks = bookmarks
    setBookmarks((prev) => prev.filter((b) => b.id !== id))

    const { error } = await supabase.from('bookmarks').delete().eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      setBookmarks(previousBookmarks)
    } else {
      bcRef.current?.postMessage({ type: 'refresh' })
    }
  }

  //  Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBookmarks([])
  }

  // --- RENDERING ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  // 1. Login View
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black relative overflow-hidden text-white px-4">
        {/* Abstract Background */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="z-10 text-center space-y-8 max-w-md w-full px-6 py-10 rounded-3xl backdrop-blur-3xl border border-white/5 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 transform rotate-3">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">SmartMarks</h1>
          </div>
          
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="group w-full flex items-center justify-center gap-3 bg-white text-black px-6 py-4 rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/10"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    )
  }

  // 2. Main App View
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 font-sans pb-20">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-0 right-1/4 w-[800px] h-[600px] bg-indigo-900/10 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8 md:space-y-12">
        
        {/* Header - Mobile Optimized */}
        <header className="flex items-center justify-between backdrop-blur-md bg-white/5 p-3 md:p-4 rounded-2xl border border-white/5 sticky top-4 z-50 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <BookmarkIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold leading-none tracking-tight truncate">Bookmarks</h1>
              {/* Hide email on very small screens to save space */}
              <p className="text-xs text-zinc-400 mt-1 font-mono hidden sm:block truncate">{user.email}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 font-medium text-sm group flex-shrink-0"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Input Area - Mobile Stacked */}
        <div className="max-w-3xl mx-auto">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-lg"></div>
            
            <form onSubmit={addBookmark} className="relative bg-[#0f0f11] border border-white/10 p-3 rounded-2xl flex flex-col md:flex-row gap-3 shadow-2xl">
              <div className="flex-1 flex items-center px-4 bg-white/5 rounded-xl border border-transparent focus-within:border-indigo-500/50 transition-colors h-12 md:h-14">
                <Search className="w-5 h-5 text-zinc-500 mr-3 flex-shrink-0" />
                <input
                  placeholder="Page Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-transparent w-full outline-none placeholder:text-zinc-600 text-sm text-zinc-200 min-w-0"
                />
              </div>
              <div className="flex-[1.5] flex items-center px-4 bg-white/5 rounded-xl border border-transparent focus-within:border-indigo-500/50 transition-colors h-12 md:h-14">
                <Globe className="w-5 h-5 text-zinc-500 mr-3 flex-shrink-0" />
                <input
                  placeholder="URL (https://...)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-transparent w-full outline-none placeholder:text-zinc-600 text-sm text-zinc-200 font-mono min-w-0"
                />
              </div>
              <button
                disabled={!title || !url || isSubmitting}
                className="bg-white text-black h-12 md:h-14 px-4 md:px-8 rounded-xl font-bold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-white/5"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                <span className="md:hidden">Add Bookmark</span>
              </button>
            </form>
          </div>
        </div>

        {/* Bookmarks Grid */}
        <div className="space-y-6">
           {bookmarks.length > 0 && (
             <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-widest pl-2">Saved Collection</h2>
           )}

           <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
             <AnimatePresence mode='popLayout'>
               {bookmarks.map((b) => (
                 <BookmarkCard key={b.id} data={b} onDelete={deleteBookmark} />
               ))}
             </AnimatePresence>
             
             {bookmarks.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20"
                >
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                    <BookmarkIcon className="w-6 h-6 opacity-20" />
                  </div>
                  <p>Your space is empty.</p>
                </motion.div>
             )}
           </motion.div>
        </div>
      </div>
    </div>
  )
}

function BookmarkCard({ data, onDelete }: { data: Bookmark, onDelete: (id: string) => void }) {
  
  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', '') } catch { return url }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault() 
    e.stopPropagation()
    onDelete(data.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative h-full"
    >
      <a 
        href={data.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block h-full bg-[#0f0f11] border border-white/5 p-4 md:p-5 rounded-2xl hover:bg-[#18181b] hover:border-white/10 transition-all shadow-sm hover:shadow-2xl hover:shadow-black/50"
      >
        <div className="flex items-start justify-between gap-3">
          
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
            {/* Favicon Box */}
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-center flex-shrink-0 p-2">
               <img 
                 src={`https://www.google.com/s2/favicons?domain=${data.url}&sz=128`} 
                 alt="icon" 
                 className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.svgrepo.com/show/508699/landscape-placeholder.svg' }}
               />
            </div>
            
            {/* Text Content */}
            <div className="flex-1 min-w-0 pr-8 md:pr-0"> 
              <h3 className="font-semibold text-zinc-100 truncate group-hover:text-white text-base md:text-lg">
                {data.title}
              </h3>
              <p className="text-xs text-zinc-500 font-mono truncate">{getDomain(data.url)}</p>
            </div>
          </div>

          {/* DELETE BUTTON FIX: 
            1. 'opacity-100' by default (for mobile/tablet).
            2. 'lg:opacity-0 lg:group-hover:opacity-100' for desktop hover effect.
            3. Added 'touch-manipulation' for better mobile response.
          */}
          <div className="absolute top-2 right-2 md:relative md:top-0 md:right-0 z-20">
            <button
              onClick={handleDeleteClick}
              className="p-2 md:p-3 text-zinc-400 bg-zinc-900/80 md:bg-transparent rounded-xl 
                         opacity-100 lg:opacity-0 lg:group-hover:opacity-100 
                         hover:text-red-400 hover:bg-red-500/10 
                         transition-all transform active:scale-95 touch-manipulation"
              title="Delete Bookmark"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* External Link Icon - Hidden on mobile to reduce clutter, visible on desktop hover */}
        <div className="hidden lg:block absolute top-5 right-5 z-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <ExternalLink className="w-4 h-4 text-zinc-600" />
        </div>
      </a>
    </motion.div>
  )
}
