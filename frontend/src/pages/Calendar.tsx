import { useState } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "yyyy-MM-dd";
  const startStr = format(startDate, dateFormat);
  const endStr = format(endDate, dateFormat);

  // Fetch all tasks for the visible calendar grid
  const tasks = useLiveQuery(
    () => {
      if (!user) return [];
      return db.tasks.where('date').between(startStr, endStr, true, true).and(t => t.user_id === user.id).toArray();
    },
    [startStr, endStr, user?.id]
  );

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleDayClick = (day: Date) => {
    navigate(`/today?date=${format(day, 'yyyy-MM-dd')}`);
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold">Calendar</h2>
        <div className="flex items-center space-x-4 bg-secondary/30 rounded-lg p-1">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-secondary rounded-md transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-base font-medium min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-secondary rounded-md transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 bg-card border border-border shadow-sm rounded-xl overflow-hidden flex flex-col min-h-0">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-border bg-secondary/20">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 min-h-0">
          {days.map((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTasks = tasks?.filter(t => t.date === dayStr && !t.deleted) || [];

            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={`
                  border-r border-b border-border/50 p-2 relative cursor-pointer transition-colors
                  hover:bg-secondary/40 flex flex-col items-start overflow-hidden min-h-0
                  
                  ${!isCurrentMonth ? 'bg-secondary/10 text-muted-foreground/50' : 'bg-transparent'}
                  ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
                `}
              >
                <span className={`
                  text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full mb-1
                  ${isTodayDate ? 'bg-primary text-primary-foreground' : ''}
                `}>
                  {format(day, 'd')}
                </span>

                {/* Task Indicators */}
                <div className="flex-1 min-h-0 w-full overflow-hidden mt-1">
                  <div className="flex flex-wrap gap-1">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`
                          h-1.5 w-1.5 md:h-2 md:w-2 rounded-full shrink-0
                          ${task.completed ? 'bg-green-500' : 'bg-muted-foreground/50'}
                        `}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
