'use client';
import { useEffect, useState } from 'react';

interface CalEvent {
  id: string;
  title: string;
  start_time: string;
  type: string;
  color: string;
  meta?: any;
}

const TYPE_LABELS: Record<string, string> = {
  'cron': 'Scheduled Job',
  'task-created': 'Task Created',
  'task-status': 'Task Update',
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    fetch(`/missioncontrol/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`)
      .then(r => { if (!r.ok) return []; return r.json(); })
      .then(d => Array.isArray(d) ? setEvents(d) : setEvents([]));
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Generate days for month view
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const startPad = firstDay.getDay();

  function eventsForDay(date: Date) {
    const ds = date.toISOString().split('T')[0];
    return events.filter(e => e.start_time.startsWith(ds));
  }

  const selectedDayEvents = selectedDay
    ? events.filter(e => e.start_time.startsWith(selectedDay))
    : [];

  // Today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Summary counts
  const cronCount = events.filter(e => e.type === 'cron').length;
  const taskCount = events.filter(e => e.type.startsWith('task')).length;
  const errorCrons = events.filter(e => e.type === 'cron' && e.meta?.lastStatus === 'error');

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); setSelectedDay(null); }}
            className="px-3 py-1 bg-gray-800 rounded-lg hover:bg-gray-700 transition">←</button>
          <span className="font-medium text-sm">{monthName}</span>
          <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); setSelectedDay(null); }}
            className="px-3 py-1 bg-gray-800 rounded-lg hover:bg-gray-700 transition">→</button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="text-xs bg-purple-900/40 text-purple-300 px-3 py-1 rounded-full">⏰ {cronCount} scheduled jobs</span>
        <span className="text-xs bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full">📋 {taskCount} task events</span>
        {errorCrons.length > 0 && (
          <span className="text-xs bg-red-900/40 text-red-300 px-3 py-1 rounded-full">⚠️ {errorCrons.length} cron errors</span>
        )}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-xl overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-gray-900 p-2 text-xs text-gray-500 text-center font-semibold">{d}</div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-gray-950 p-2 min-h-[60px] md:min-h-[80px]" />
        ))}
        {days.map(day => {
          const dayStr = day.toISOString().split('T')[0];
          const dayEvents = eventsForDay(day);
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === selectedDay;
          const hasCron = dayEvents.some(e => e.type === 'cron');
          const hasTask = dayEvents.some(e => e.type.startsWith('task'));
          const hasError = dayEvents.some(e => e.meta?.lastStatus === 'error');

          return (
            <div key={dayStr}
              onClick={() => setSelectedDay(isSelected ? null : dayStr)}
              className={`bg-gray-950 p-2 min-h-[60px] md:min-h-[80px] cursor-pointer transition hover:bg-gray-900
                ${isToday ? 'ring-1 ring-blue-500' : ''}
                ${isSelected ? 'bg-gray-900 ring-1 ring-blue-400' : ''}`}>
              <div className={`text-xs ${isToday ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>{day.getDate()}</div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {hasCron && <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" title="Cron job" />}
                {hasTask && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" title="Task event" />}
                {hasError && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Error" />}
              </div>
              {/* Show first event title on desktop */}
              <div className="hidden md:block">
                {dayEvents.slice(0, 2).map(e => (
                  <div key={e.id} className="text-xs mt-1 truncate" style={{ color: e.color }}>{e.title}</div>
                ))}
                {dayEvents.length > 2 && <div className="text-xs text-gray-600">+{dayEvents.length - 2} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4 bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="text-gray-600 text-sm">No events</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(e => (
                <div key={e.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-800 transition">
                  <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: e.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(e.start_time).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}
                      {TYPE_LABELS[e.type] || e.type}
                    </div>
                    {e.meta?.lastError && (
                      <div className="text-xs text-red-400 mt-1">⚠️ {e.meta.lastError}</div>
                    )}
                    {e.meta?.project && (
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded mt-1 inline-block">{e.meta.project}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Cron Jobs</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Task Events</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Errors</span>
      </div>
    </div>
  );
}
