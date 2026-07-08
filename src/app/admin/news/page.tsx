'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Post {
  id: string
  slug: string
  title: string
  category: string | null
  published_at: string
}

const EMPTY = { title: '', slug: '', excerpt: '', content: '', category: 'general', cover_image_url: '', author: 'Sabula 256' }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

export default function AdminNewsPage() {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('news_posts').select('id, slug, title, category, published_at').order('published_at', { ascending: false }).limit(50)
    setPosts((data ?? []) as Post[])
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form.title.trim() || !form.content.trim() || !form.slug.trim()) {
      setMsg('Title, slug and content are required.'); return
    }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('news_posts').insert({
      title:           form.title.trim(),
      slug:            form.slug.trim(),
      excerpt:         form.excerpt.trim() || null,
      content:         form.content.trim(),
      category:        form.category || 'general',
      cover_image_url: form.cover_image_url.trim() || null,
      author:          form.author.trim() || 'Sabula 256',
      published_at:    new Date().toISOString(),
    })
    if (error) { setMsg(error.message) } else { setMsg('Published!'); setForm(EMPTY); load() }
    setSaving(false)
  }

  async function del(id: string) {
    setDeleting(id)
    await supabase.from('news_posts').delete().eq('id', id)
    load()
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-2xl font-black text-white">News Posts</h1>

        {/* Create form */}
        <div className="rounded-2xl border border-[#1e1e2e] bg-[#0d0d14] p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">New Post</h2>

          {[
            { key: 'title',           label: 'Title',         placeholder: 'Will Uganda win AFCON 2026?' },
            { key: 'slug',            label: 'Slug',          placeholder: 'uganda-afcon-2026-preview' },
            { key: 'excerpt',         label: 'Excerpt',       placeholder: 'Short summary shown on the listing page...' },
            { key: 'cover_image_url', label: 'Cover image URL', placeholder: 'https://...' },
            { key: 'author',          label: 'Author',        placeholder: 'Sabula 256' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={e => {
                  const val = e.target.value
                  setForm(prev => ({
                    ...prev,
                    [key]: val,
                    ...(key === 'title' && !prev.slug ? { slug: slugify(val) } : {}),
                  }))
                }}
                placeholder={placeholder}
                className="w-full rounded-lg border border-[#2a2a3e] bg-[#131320] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-600"
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-lg border border-[#2a2a3e] bg-[#131320] px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"
            >
              {['general', 'football', 'politics', 'economy', 'entertainment', 'tech'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400">Content (double line-break = new paragraph)</label>
            <textarea
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              rows={12}
              placeholder="Write the full article here..."
              className="w-full rounded-lg border border-[#2a2a3e] bg-[#131320] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-600 resize-y"
            />
          </div>

          {msg && <p className={`text-sm ${msg === 'Published!' ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Publishing…' : 'Publish post'}
          </button>
        </div>

        {/* Posts list */}
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Published Posts</h2>
          {posts.length === 0 ? (
            <p className="text-slate-600 text-sm">No posts yet.</p>
          ) : (
            <div className="space-y-2">
              {posts.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-[#1e1e2e] bg-[#0d0d14] px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{p.title}</p>
                    <p className="text-xs text-slate-600">/news/{p.slug} · {p.category} · {new Date(p.published_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => del(p.id)}
                    disabled={deleting === p.id}
                    className="shrink-0 rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {deleting === p.id ? '…' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
