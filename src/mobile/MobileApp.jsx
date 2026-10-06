// src/mobile/MobileApp.jsx
import React, { useState } from 'react';
import { Home, ClipboardList, User, Wifi } from 'lucide-react';
import { cn } from '../components/shared';
import HomeTab from './HomeTab';
import TasksTab from './TasksTab';
import ProfileTab from './ProfileTab';

export default function MobileApp() {
  const [tab, setTab] = useState('home');
  const [now, setNow] = useState(new Date());

  // ticking clock buat status bar HP
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tasks', icon: ClipboardList, label: 'Tugas' },
    { id: 'profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border-8 border-slate-900 relative">
        {/* Status Bar */}
        <div className="bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-slate-900">
          <span>{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            <div className="w-5 h-2.5 border border-slate-900 rounded-sm relative">
              <div className="absolute inset-0.5 bg-slate-900 rounded-sm" style={{ width: '70%' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[700px] overflow-y-auto bg-[#F8FAFC] pb-20">
          {tab === 'home' && <HomeTab />}
          {tab === 'tasks' && <TasksTab />}
          {tab === 'profile' && <ProfileTab />}
        </div>

        {/* Bottom Nav */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 pt-2 pb-5">
          <div className="flex justify-around">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-1',
                    active ? 'text-indigo-600' : 'text-slate-400'
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}