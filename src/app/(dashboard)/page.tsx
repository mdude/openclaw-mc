'use client';
import { useEffect, useState, useCallback } from 'react';

interface Task {
  id: number; title: string; description: string; instruction: string; status: string;
  priority: string; assignee: string; project: string; created_at: string; updated_at: string;
}

interface Project {
  name: string; status: string; description: string;
}

const STATUS_COLS = ['backlog', 'active', 'in_progress', 'done'];
const STATUS_LABELS: Record<string, string> = { backlog: 'Backlog', active: 'Active', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_COLORS: Record<string, string> = { urgent: 'border-red-500', high: 'border-orange-500', medium: 'border-blue-500', low: 'border-gray-600' };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newProject, setNewProject] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newAssignee, setNewAssignee] = useState('m8ke');
  const [groupBy, setGroupBy] = useState<'status' | 'project'>('status');
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [reopeningTask, setReopeningTask] = useState<number | null>(null);
  const [reopenComment, setReopenComment] = useState('');

  const load = useCallback(() => {
    fetch('/missioncontrol/api/tasks').then(r => {
      if (!r.ok) { window.location.href = '/missioncontrol/login'; return []; }
      return r.json();
    }).then(d => Array.isArray(d) ? setTasks(d.filter((t: Task) => t.status !== 'archived')) : setTasks([]));
  }, []);

  const loadProjects = useCallback(() => {
    fetch('/missioncontrol/api/projects').then(r => {
      if (!r.ok) return [];
      return r.json();
    }).then(d => Array.isArray(d) ? setProjects(d) : setProjects([]));
  }, []);

  useEffect(() => { load(); loadProjects(); }, [load, loadProjects]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await fetch('/missioncontrol/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, priority: newPriority, project: newProject || null, instruction: newInstruction || null, assignee: newAssignee }),
    });
    setNewTitle(''); setNewProject(''); setNewInstruction(''); setNewAssignee('m8ke'); setShowNew(false); load();
  }

  async function moveTask(id: number, status: string) {
    await fetch(`/missioncontrol/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function startEdit(t: Task) {
    setEditingTask(t.id);
    setEditTitle(t.title || '');
    setEditProject(t.project || '');
    setEditPriority(t.priority || 'medium');
    setEditInstruction(t.instruction || '');
    setEditAssignee(t.assignee || 'm8ke');
  }

  async function saveEdit(id: number) {
    await fetch(`/missioncontrol/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, project: editProject, priority: editPriority, instruction: editInstruction, assignee: editAssignee }),
    });
    setEditingTask(null);
    load();
  }

  function cancelEdit() {
    setEditingTask(null);
  }

  async function reopenTask(id: number) {
    if (reopenComment.trim()) {
      await fetch(`/missioncontrol/api/tasks/${id}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reopenComment }),
      });
    }
    await fetch(`/missioncontrol/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    setReopeningTask(null);
    setReopenComment('');
    load();
  }

  const groupedByStatus = STATUS_COLS.map(s => {
    let filtered = tasks.filter(t => t.status === s);
    if (s === 'done') filtered = [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return { label: STATUS_LABELS[s], key: s, tasks: filtered };
  });
  const projectNames = [...new Set(tasks.map(t => t.project || 'Unassigned'))].sort();
  const groupedByProject = projectNames.map(p => ({ label: p, key: p, tasks: tasks.filter(t => (t.project || 'Unassigned') === p) }));
  const groups = groupBy === 'status' ? groupedByStatus : groupedByProject;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <div className="flex gap-2">
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
            className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
            <option value="status">By Status</option>
            <option value="project">By Project</option>
          </select>
          <button onClick={() => setShowNew(!showNew)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition">
            + New Task
          </button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={createTask} className="bg-gray-900 p-4 rounded-xl mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Task title..." value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none" autoFocus />
            <select value={newProject} onChange={e => setNewProject(e.target.value)}
              className="px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <option value="">No Project</option>
              {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
              className="px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="urgent">Urgent</option>
            </select>
            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
              className="px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
              <option value="m8ke">🤖 M8ke</option>
              <option value="human">👤 Human</option>
            </select>
          </div>
          <textarea placeholder="Instruction — detailed instructions for M8ke..." value={newInstruction}
            onChange={e => setNewInstruction(e.target.value)} rows={10}
            className="w-full px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none resize-y text-sm" />
          <div className="flex justify-end">
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition">Create</button>
          </div>
        </form>
      )}

      {/* Edit Modal */}
      {editingTask !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={cancelEdit}>
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Edit Task</h3>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Title</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Project</label>
                <select value={editProject} onChange={e => setEditProject(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700">
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Priority</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700">
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Assignee</label>
                <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700">
                  <option value="m8ke">🤖 M8ke</option>
                  <option value="human">👤 Human</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Instruction</label>
              <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)}
                placeholder="Detailed instructions for M8ke..."
                rows={10}
                className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none resize-y text-sm" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={cancelEdit}
                className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-lg transition">Cancel</button>
              <button onClick={() => saveEdit(editingTask)}
                className="bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-lg transition font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Task groups */}
      <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
        {groups.map(g => (
          <div key={g.key} className="bg-gray-900/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">{g.label} ({g.tasks.length})</h3>
            <div className="space-y-2">
              {g.tasks.map(t => {
                const isExpanded = expandedTask === t.id;
                return (
                  <div key={t.id} className={`bg-gray-800 p-3 rounded-lg border-l-4 ${PRIORITY_COLORS[t.priority] || 'border-gray-700'} transition`}>
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : t.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm"><span className="text-gray-500 mr-1">#{t.id}</span>{t.title}</div>
                        <div className="flex gap-2 mt-1 flex-wrap items-center">
                          {t.project && <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{t.project}</span>}
                          {t.assignee && <span className={`text-xs ${t.assignee === 'human' ? 'text-yellow-400' : 'text-gray-500'}`}>{t.assignee === 'human' ? '👤' : '🤖'} {t.assignee}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                        {t.status === 'done' ? (
                          <>
                            <button onClick={() => { setReopeningTask(t.id); setReopenComment(''); }}
                              className="text-xs bg-orange-700 hover:bg-orange-600 px-1.5 py-0.5 rounded transition" title="Reopen">🔄</button>
                            <button onClick={() => moveTask(t.id, 'archived')}
                              className="text-xs bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded transition" title="Archive">📦</button>
                          </>
                        ) : (
                          STATUS_COLS.filter(s => s !== t.status).map(s => (
                            <button key={s} onClick={() => moveTask(t.id, s)}
                              className="text-xs bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded transition" title={STATUS_LABELS[s]}>
                              → {STATUS_LABELS[s]}
                            </button>
                          ))
                        )}
                        <span className="text-gray-500 text-xs ml-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setExpandedTask(isExpanded ? null : t.id); }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                        {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                        {t.instruction && (
                          <div>
                            <div className="text-xs text-gray-500 font-semibold mb-1">Instruction:</div>
                            <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded whitespace-pre-wrap">{t.instruction}</pre>
                          </div>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                            className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded transition">
                            ✏️ Edit
                          </button>
                        </div>
                        {reopeningTask === t.id && (
                          <div className="w-full mt-2 space-y-2" onClick={e => e.stopPropagation()}>
                            <textarea value={reopenComment} onChange={e => setReopenComment(e.target.value)}
                              placeholder="Why are you reopening this? What needs to change?"
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-xs resize-y" />
                            <div className="flex gap-2">
                              <button onClick={() => { setReopeningTask(null); setReopenComment(''); }}
                                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition">Cancel</button>
                              <button onClick={() => reopenTask(t.id)}
                                className="text-xs bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded transition font-semibold">Reopen → Active</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {g.tasks.length === 0 && <p className="text-gray-600 text-sm">No tasks</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
