'use client';
import { useEffect, useState } from 'react';

export default function MemoryPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetch('/missioncontrol/api/memory/files').then(r => { if (!r.ok) return []; return r.json(); }).then(d => Array.isArray(d) ? setFiles(d) : setFiles([]));
    // Reindex on first load
    fetch('/missioncontrol/api/memory/reindex', { method: 'POST' });
  }, []);

  async function loadFile(path: string) {
    setSelectedFile(path);
    setEditing(false);
    const res = await fetch(`/missioncontrol/api/memory/files/${path}`);
    const data = await res.json();
    setContent(data.content);
    setEditContent(data.content);
  }

  async function search() {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const res = await fetch(`/missioncontrol/api/memory/search?q=${encodeURIComponent(searchQuery)}`);
    setSearchResults(await res.json());
  }

  async function saveFile() {
    if (!selectedFile) return;
    await fetch(`/missioncontrol/api/memory/files/${selectedFile}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    setContent(editContent);
    setEditing(false);
    // Reindex after edit
    fetch('/missioncontrol/api/memory/reindex', { method: 'POST' });
  }

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6">Memory</h2>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input type="text" placeholder="Search memory..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none" />
        <button onClick={search} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">Search</button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-semibold text-gray-400">Search Results</h3>
          {searchResults.map((r: any) => (
            <div key={r.id} onClick={() => loadFile(r.file_path)}
              className="bg-gray-900 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition">
              <div className="text-sm font-medium text-blue-400">{r.file_path}</div>
              <div className="text-xs text-gray-400 mt-1">{r.section}</div>
              <div className="text-xs text-gray-500 mt-1" dangerouslySetInnerHTML={{ __html: r.snippet }} />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* File list */}
        <div className="md:w-56 shrink-0">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Files</h3>
          <div className="space-y-1">
            {files.map(f => (
              <button key={f} onClick={() => loadFile(f)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedFile === f ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {selectedFile ? (
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-gray-300">{selectedFile}</h3>
                <button onClick={() => editing ? saveFile() : setEditing(true)}
                  className={`text-xs px-3 py-1 rounded-lg transition ${editing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  {editing ? 'Save' : 'Edit'}
                </button>
              </div>
              {editing ? (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  className="w-full h-96 bg-gray-800 p-3 rounded-lg font-mono text-sm border border-gray-700 focus:border-blue-500 focus:outline-none resize-y" />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono overflow-auto max-h-[70vh]">{content}</pre>
              )}
            </div>
          ) : (
            <div className="text-gray-600 text-center py-20">Select a file to view</div>
          )}
        </div>
      </div>
    </div>
  );
}
