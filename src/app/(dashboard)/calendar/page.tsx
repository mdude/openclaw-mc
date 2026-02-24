'use client';
import { useEffect, useState } from 'react';

interface CalEvent {
  id: number; title: string; description: string; source: string;
  start_time: string; end_time: string; color: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    const start = new Date(currentDate);
    start.setDate(1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setMonth(end.getMonth() + 1);
    fetch(`/missioncontrol/api/events?start=${start.toISOString()}&end=${end.toISOString()}`)
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

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
            className="px-3 py-1 bg-gray-800 rounded-lg hover:bg-gray-700 transition">←</button>
          <span className="font-medium">{monthName}</span>
          <button onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
            className="px-3 py-1 bg-gray-800 rounded-lg hover:bg-gray-700 transition">→</button>
        </div>
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
          const dayEvents = eventsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={day.toISOString()} className={`bg-gray-950 p-2 min-h-[60px] md:min-h-[80px] ${isToday ? 'ring-1 ring-blue-500' : ''}`}>
              <div className={`text-xs ${isToday ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>{day.getDate()}</div>
              {dayEvents.slice(0, 2).map(e => (
                <div key={e.id} className="text-xs mt-1 px-1 py-0.5 rounded bg-blue-600/20 text-blue-300 truncate">
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 2 && <div className="text-xs text-gray-500 mt-1">+{dayEvents.length - 2} more</div>}
            </div>
          );
        })}
      </div>

      {/* Events list below */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Upcoming Events</h3>
        {events.length === 0 ? (
          <p className="text-gray-600 text-sm">No events this month</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map(e => (
              <div key={e.id} className="bg-gray-900 p-3 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color || '#3b82f6' }} />
                <div>
                  <div className="font-medium text-sm">{e.title}</div>
                  <div className="text-xs text-gray-500">{new Date(e.start_time).toLocaleString()}</div>
                </div>
                <span className="ml-auto text-xs text-gray-600">{e.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
