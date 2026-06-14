/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Heart, 
  Settings, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Moon, 
  Sun, 
  Coffee, 
  Info,
  CheckCircle2,
  Activity,
  Droplets,
  MessageCircleHeart,
  Sparkles,
  Loader2,
  Send,
  Pill,
  Lock,
  CreditCard,
  ShieldCheck,
  Check,
  Bell,
  Clock
} from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, subDays, addMonths, subMonths, getDay, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { UserData, MoodEntry, RecoveryPlan, FibroidEntry } from './types';
import { MEAL_SUGGESTIONS, RECOVERY_MEDS, FAMILY_PLANNING_MEDS, FIBROID_SYMPTOMS, FIBROID_INFO } from './constants';
import SkincareHub from './components/SkincareHub';
import CycleInsightsCard from './components/CycleInsightsCard';

export default function App() {
  const [userData, setUserData] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('luna_user_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.notificationsEnabled === undefined) parsed.notificationsEnabled = false;
      if (!parsed.notificationTime) parsed.notificationTime = "20:00";
      return parsed;
    }
    return null;
  });

  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(() => {
    const saved = localStorage.getItem('luna_mood_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [fibroidEntries, setFibroidEntries] = useState<FibroidEntry[]>(() => {
    const saved = localStorage.getItem('luna_fibroid_entries');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracking' | 'fibroids' | 'recovery' | 'settings' | 'skincare'>('dashboard');
  const [autoOpenAddLog, setAutoOpenAddLog] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationDismissedDate, setNotificationDismissedDate] = useState<string | null>(() => {
    return localStorage.getItem('luna_dismissed_notification_date');
  });
  const [testNotificationOverride, setTestNotificationOverride] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (userData?.notificationsEnabled && userData?.notificationTime) {
        const [configHours, configMins] = userData.notificationTime.split(':').map(Number);
        if (now.getHours() === configHours && now.getMinutes() === configMins && now.getSeconds() < 15) {
          const todayStr = format(now, 'yyyy-MM-dd');
          const hasLoggedInput = moodEntries.some(entry => entry.date === todayStr) || fibroidEntries.some(entry => entry.date === todayStr);
          if (!hasLoggedInput && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification("LunaCare Daily Reminder", {
                body: "Hi! It's time to check in and log your symptoms for today. 🌸",
              });
            } catch (err) {
              console.error("Browser system notification failed", err);
            }
          }
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [userData, moodEntries, fibroidEntries]);

  // Synchronise everything on mount
  useEffect(() => {
    // 1. Fetch User Profile
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserData(data.user);
          localStorage.setItem('luna_user_data', JSON.stringify(data.user));
        } else {
          const saved = localStorage.getItem('luna_user_data');
          if (saved) {
            const parsed = JSON.parse(saved);
            fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed)
            }).catch(err => console.error("Initial profile push failed", err));
          }
        }
      })
      .catch(err => console.error("Could not fetch user profile from db:", err));

    // 2. Fetch Mood entries
    fetch('/api/mood')
      .then(res => res.json())
      .then(data => {
        if (data.entries && data.entries.length > 0) {
          setMoodEntries(data.entries);
          localStorage.setItem('luna_mood_entries', JSON.stringify(data.entries));
        } else {
          const saved = localStorage.getItem('luna_mood_entries');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.length > 0) {
              setMoodEntries(parsed);
              fetch('/api/mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: parsed })
              }).catch(err => console.error("Initial mood push failed", err));
            }
          }
        }
      })
      .catch(err => console.error("Could not fetch mood entries from db:", err));

    // 3. Fetch Fibroid entries
    fetch('/api/fibroids')
      .then(res => res.json())
      .then(data => {
        if (data.entries && data.entries.length > 0) {
          setFibroidEntries(data.entries);
          localStorage.setItem('luna_fibroid_entries', JSON.stringify(data.entries));
        } else {
          const saved = localStorage.getItem('luna_fibroid_entries');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.length > 0) {
              setFibroidEntries(parsed);
              fetch('/api/fibroids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: parsed })
              }).catch(err => console.error("Initial fibroids push failed", err));
            }
          }
        }
      })
      .catch(err => console.error("Could not fetch fibroid entries from db:", err));
  }, []);

  useEffect(() => {
    if (userData) {
      localStorage.setItem('luna_user_data', JSON.stringify(userData));
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }).catch(err => console.error("Failed to sync user data:", err));
    }
  }, [userData]);

  useEffect(() => {
    localStorage.setItem('luna_mood_entries', JSON.stringify(moodEntries));
    if (moodEntries.length > 0) {
      fetch('/api/mood', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: moodEntries })
      }).catch(err => console.error("Failed to sync mood logs:", err));
    }
  }, [moodEntries]);

  useEffect(() => {
    localStorage.setItem('luna_fibroid_entries', JSON.stringify(fibroidEntries));
    if (fibroidEntries.length > 0) {
      fetch('/api/fibroids', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: fibroidEntries })
      }).catch(err => console.error("Failed to sync fibroid logs:", err));
    }
  }, [fibroidEntries]);

  if (!userData || !userData.onboardingComplete) {
    return <Onboarding onComplete={(data) => setUserData({ ...data, onboardingComplete: true, notificationsEnabled: false, notificationTime: "20:00" })} />;
  }

  const todayStr = format(currentTime, 'yyyy-MM-dd');
  const hasLoggedToday = moodEntries.some(entry => entry.date === todayStr) || fibroidEntries.some(entry => entry.date === todayStr);
  const isNotificationDismissedToday = notificationDismissedDate === todayStr;

  const isTimeReached = (() => {
    if (testNotificationOverride) return true;
    if (!userData?.notificationsEnabled || !userData?.notificationTime) return false;
    const [configHours, configMins] = userData.notificationTime.split(':').map(Number);
    const currHours = currentTime.getHours();
    const currMins = currentTime.getMinutes();
    
    if (currHours > configHours) return true;
    if (currHours === configHours && currMins >= configMins) return true;
    return false;
  })();

  const showNotificationPrompt = (userData?.notificationsEnabled || testNotificationOverride) && isTimeReached && !hasLoggedToday && !isNotificationDismissedToday;

  const handleDismissNotification = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setNotificationDismissedDate(today);
    localStorage.setItem('luna_dismissed_notification_date', today);
    setTestNotificationOverride(false);
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-serif font-bold text-brand-900">LunaCare</h1>
          <p className="text-xs text-brand-600 uppercase tracking-widest font-medium">Welcome, {userData.name}</p>
        </div>
        <button 
          onClick={() => setActiveTab('settings')}
          className="p-2 rounded-full bg-white shadow-sm hover:bg-brand-100 transition-colors"
        >
          <Settings className="w-5 h-5 text-brand-700" />
        </button>
      </header>

      {/* Daily Symptom Prompt Banner */}
      <AnimatePresence>
        {showNotificationPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="px-6 pb-4 overflow-hidden shrink-0"
          >
            <div className="bg-brand-600 text-white rounded-3xl p-5 shadow-lg shadow-brand-200/50 flex flex-col gap-3 relative border border-brand-500">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Bell className="w-4 h-4 text-white animate-bounce" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-100">Daily Log Reminder</span>
                </div>
                <button 
                  onClick={handleDismissNotification}
                  className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm leading-snug">Time to check-in with your body</h4>
                <p className="text-[11px] text-brand-100/90 leading-relaxed font-sans">
                  Logging your symptoms daily helps refine predictions and recovery guides. Would you like to check in now?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tracking');
                    setAutoOpenAddLog(true);
                  }}
                  className="flex-1 py-2 bg-white text-brand-900 font-bold rounded-xl text-xs hover:bg-brand-50 transition-all text-center"
                >
                  Log Symptoms Now
                </button>
                <button
                  type="button"
                  onClick={handleDismissNotification}
                  className="px-4 py-2 bg-brand-700 text-white font-bold rounded-xl text-xs hover:bg-brand-800 transition-all text-center border border-brand-500"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              <CycleCard userData={userData} />
              {userData.hasFibroids && <FibroidSummary entries={fibroidEntries} />}
              <CycleInsightsCard 
                userData={userData} 
                moodEntries={moodEntries} 
                fibroidEntries={fibroidEntries} 
              />
              <MoodSummary entries={moodEntries} />
              <QuickActions 
                onAddMood={() => setActiveTab('tracking')} 
                onAddFibroid={() => setActiveTab('fibroids')}
                hasFibroids={userData.hasFibroids}
              />
            </motion.div>
          )}

          {activeTab === 'tracking' && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              <MoodTracker 
                entries={moodEntries} 
                onAddEntry={(entry) => setMoodEntries([entry, ...moodEntries])} 
                fibroidEntries={fibroidEntries}
                autoOpenAdd={autoOpenAddLog}
                onSetAutoOpenAdd={setAutoOpenAddLog}
              />
            </motion.div>
          )}

          {activeTab === 'fibroids' && (
            <motion.div
              key="fibroids"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              <FibroidTracker 
                entries={fibroidEntries} 
                onAddEntry={(entry) => setFibroidEntries([entry, ...fibroidEntries])} 
              />
            </motion.div>
          )}

          {activeTab === 'recovery' && (
            <motion.div
              key="recovery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              <RecoveryCenter userData={userData} onUpdateUserData={setUserData} />
            </motion.div>
          )}

          {activeTab === 'skincare' && (
            <motion.div
              key="skincare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              <SkincareHub userData={userData} onUpdateUserData={setUserData} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-4"
            >
              <SettingsView 
                userData={userData} 
                onUpdate={setUserData} 
                onTriggerTestNotification={() => {
                  setTestNotificationOverride(true);
                  setNotificationDismissedDate(null);
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-brand-100 px-3 py-3 flex justify-between items-center z-20">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<Sun className="w-6 h-6" />} 
          label="Home" 
        />
        <NavButton 
          active={activeTab === 'tracking'} 
          onClick={() => setActiveTab('tracking')} 
          icon={<Activity className="w-6 h-6" />} 
          label="Track" 
        />
        {userData.hasFibroids && (
          <NavButton 
            active={activeTab === 'fibroids'} 
            onClick={() => setActiveTab('fibroids')} 
            icon={<Droplets className="w-6 h-6" />} 
            label="Fibroids" 
          />
        )}
        <NavButton 
          active={activeTab === 'recovery'} 
          onClick={() => setActiveTab('recovery')} 
          icon={<Heart className="w-6 h-6" />} 
          label="Recover" 
        />
        <NavButton 
          active={activeTab === 'skincare'} 
          onClick={() => setActiveTab('skincare')} 
          icon={<Sparkles className="w-6 h-6" />} 
          label="Glow" 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<Settings className="w-6 h-6" />} 
          label="More" 
        />
      </nav>
    </div>
  );
}

// --- Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        active ? "text-brand-600 scale-110" : "text-brand-300 hover:text-brand-400"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Onboarding({ onComplete }: { onComplete: (data: UserData) => void }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserData>>({
    name: '',
    lastPeriodDate: format(new Date(), 'yyyy-MM-dd'),
    cycleLength: 28,
    periodLength: 5,
    hasFibroids: false,
  });

  const steps = [
    {
      title: "Welcome to LunaCare",
      description: "A secure, compassionate, and completely private space designed to support your reproductive wellbeing, healing recovery, and cycle health.",
      content: (
        <div className="space-y-6">
          <div className="flex justify-center py-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="p-4 rounded-full bg-brand-100 text-brand-600"
            >
              <Heart className="w-12 h-12" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-brand-800">What should we call you?</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name or nickname"
              className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none transition-all bg-white"
            />
            <p className="text-[11px] text-brand-500 leading-relaxed italic">
              *Your privacy is our priority. All medical data is stored safely on your device.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Your Cycle Basics",
      description: "Sharing your last menstrual period (LMP) and baseline helps LunaCare predict fertile windows and calculate cycle transitions with high precision.",
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-brand-800">When did your last menstrual period (LMP) start?</label>
            <input 
              type="date" 
              value={formData.lastPeriodDate}
              onChange={(e) => setFormData({ ...formData, lastPeriodDate: e.target.value })}
              className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none transition-all bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-800">Average Cycle Length</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="20"
                  max="45"
                  value={formData.cycleLength}
                  onChange={(e) => setFormData({ ...formData, cycleLength: parseInt(e.target.value) || 28 })}
                  className="w-full p-4 pr-12 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none transition-all bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-500">Days</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-brand-800">Bleeding Duration</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="2"
                  max="10"
                  value={formData.periodLength}
                  onChange={(e) => setFormData({ ...formData, periodLength: parseInt(e.target.value) || 5 })}
                  className="w-full p-4 pr-12 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none transition-all bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-500">Days</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Your Companion Essentials",
      description: "LunaCare supports you through every layer of your health and recovery journey:",
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 flex gap-4 items-start">
            <div className="p-2.5 rounded-xl bg-white text-brand-600 shadow-sm shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-brand-900 text-sm">Dynamic Cycle Tracking</h4>
              <p className="text-xs text-brand-700 font-medium leading-relaxed">Observe hormonal phases, ovulation windows, symptoms, and mood flows with deep bodily intelligence.</p>
            </div>
          </div>
          
          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 flex gap-4 items-start">
            <div className="p-2.5 rounded-xl bg-white text-brand-600 shadow-sm shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-brand-900 text-sm">Medication Companion</h4>
              <p className="text-xs text-brand-700 font-medium leading-relaxed">Track contraceptives, supplements, or medical procedures, mapping their mood variations easily.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-100 flex gap-4 items-start">
            <div className="p-2.5 rounded-xl bg-white text-brand-600 shadow-sm shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-brand-900 text-sm">Recovery Support</h4>
              <p className="text-xs text-brand-700 font-medium leading-relaxed font-sans">Find delicate post-abortion nutrition layouts, comfort remedies, and private AI advice.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-brand-100">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, hasFibroids: !prev.hasFibroids }))}
              className={cn(
                "w-full p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center",
                formData.hasFibroids ? "border-brand-600 bg-brand-50/50" : "border-brand-100 bg-white"
              )}
            >
              <div>
                <h5 className="font-bold text-brand-900 text-xs">Uterine Fibroids Module (Optional)</h5>
                <p className="text-[10px] text-brand-600">Include specialized logging for fibroid pain levels & symptoms.</p>
              </div>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                formData.hasFibroids ? "border-brand-600 bg-brand-600 text-white" : "border-brand-200"
              )}>
                {formData.hasFibroids && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(formData as UserData);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      <motion.div 
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full space-y-6"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif font-bold text-brand-900 leading-tight">{steps[step].title}</h2>
          <p className="text-brand-600 text-xs leading-relaxed max-w-sm mx-auto">{steps[step].description}</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-brand-200/50 border border-brand-100">
          {steps[step].content}
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="p-3 text-brand-600 hover:bg-brand-100 rounded-full transition-colors"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-11" /> // Spacer to preserve alignment
            )}
            
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === step ? "w-6 bg-brand-600" : "w-1.5 bg-brand-200"
                  )} 
                />
              ))}
            </div>
          </div>
          
          <button 
            onClick={handleNext}
            disabled={step === 0 && !formData.name}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-200/50 hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs text-uppercase"
          >
            {step === steps.length - 1 ? "Get Started" : "Continue"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CycleCard({ userData }: { userData: UserData }) {
  const lastDate = new Date(userData.lastPeriodDate);
  const nextDate = addDays(lastDate, userData.cycleLength);
  const daysUntil = Math.max(0, Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-brand-600 rounded-[2rem] p-8 text-white shadow-xl shadow-brand-200 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Moon className="w-32 h-32" />
      </div>
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-brand-100 text-xs uppercase tracking-widest font-bold">Next Period In</p>
            <h3 className="text-6xl font-serif font-bold">{daysUntil} Days</h3>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-brand-100">
          <div className="flex items-center gap-1.5">
            <Droplets className="w-4 h-4" />
            <span>Cycle: {userData.cycleLength}d</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-brand-300" />
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4" />
            <span>Period: {userData.periodLength}d</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FibroidSummary({ entries }: { entries: FibroidEntry[] }) {
  const recentEntries = entries.slice(0, 7).reverse();
  const data = recentEntries.map(e => ({
    date: format(new Date(e.date), 'MMM d'),
    painLevel: e.painLevel
  }));

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-brand-100 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-brand-900">Fibroid Pain Levels</h3>
        <span className="text-xs text-brand-500 font-medium">Last 7 entries</span>
      </div>
      <div className="h-40 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="painLevel" 
                stroke="#c95236" 
                strokeWidth={3} 
                dot={{ fill: '#c95236', r: 4 }} 
              />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 11]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-brand-300 gap-2">
            <Droplets className="w-8 h-8 opacity-20" />
            <p className="text-xs">No fibroid data yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FibroidTracker({ entries, onAddEntry }: { entries: FibroidEntry[], onAddEntry: (entry: FibroidEntry) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<FibroidEntry>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    painLevel: 5,
    bleedingIntensity: 'none',
    symptoms: [],
    notes: ''
  });

  const intensities: { id: FibroidEntry['bleedingIntensity'], label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'spotting', label: 'Spotting' },
    { id: 'light', label: 'Light' },
    { id: 'medium', label: 'Medium' },
    { id: 'heavy', label: 'Heavy' },
    { id: 'very-heavy', label: 'Very Heavy' },
  ];

  const handleSubmit = () => {
    onAddEntry(newEntry as FibroidEntry);
    setIsAdding(false);
    setNewEntry({
      date: format(new Date(), 'yyyy-MM-dd'),
      painLevel: 5,
      bleedingIntensity: 'none',
      symptoms: [],
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-brand-900">Fibroid Tracking</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-2 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-200"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl border border-brand-100 space-y-6"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-700">Pain Level (1-10)</label>
                <span className="text-xl font-serif font-bold text-brand-600">{newEntry.painLevel}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={newEntry.painLevel}
                onChange={(e) => setNewEntry({ ...newEntry, painLevel: parseInt(e.target.value) })}
                className="w-full accent-brand-600"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">Bleeding Intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {intensities.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => setNewEntry({ ...newEntry, bleedingIntensity: i.id })}
                    className={cn(
                      "py-2 px-1 rounded-xl border-2 text-[10px] font-bold uppercase transition-all",
                      newEntry.bleedingIntensity === i.id ? "border-brand-600 bg-brand-50 text-brand-600" : "border-brand-50 bg-white text-brand-400"
                    )}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">Symptoms</label>
              <div className="flex flex-wrap gap-2">
                {FIBROID_SYMPTOMS.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const current = newEntry.symptoms || [];
                      if (current.includes(s)) {
                        setNewEntry({ ...newEntry, symptoms: current.filter(x => x !== s) });
                      } else {
                        setNewEntry({ ...newEntry, symptoms: [...current, s] });
                      }
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-medium transition-all",
                      newEntry.symptoms?.includes(s) ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">Notes</label>
              <textarea 
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                placeholder="Any specific observations..."
                className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none bg-brand-50/50 text-sm h-24 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-brand-100 font-bold text-brand-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="flex-2 py-4 rounded-2xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-200"
              >
                Save Log
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-brand-100/50 p-6 rounded-[2rem] space-y-3">
        <h4 className="font-bold text-brand-900 flex items-center gap-2">
          <Info className="w-4 h-4" />
          {FIBROID_INFO.title}
        </h4>
        <p className="text-xs text-brand-700 leading-relaxed">{FIBROID_INFO.description}</p>
        <ul className="space-y-2 pt-2">
          {FIBROID_INFO.tips.map((tip, i) => (
            <li key={i} className="text-[10px] flex items-start gap-2 text-brand-600">
              <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-100 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">{format(new Date(entry.date), 'MMMM d, yyyy')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-brand-700">Pain: {entry.painLevel}/10</span>
                  <div className="w-1 h-1 rounded-full bg-brand-200" />
                  <span className="text-xs font-bold text-brand-700 capitalize">Bleeding: {entry.bleedingIntensity.replace('-', ' ')}</span>
                </div>
              </div>
            </div>
            {entry.symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {entry.symptoms.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-brand-100 text-brand-700">{s}</span>
                ))}
              </div>
            )}
            {entry.notes && (
              <p className="text-xs text-brand-600 italic border-l-2 border-brand-200 pl-3">{entry.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function MoodSummary({ entries }: { entries: MoodEntry[] }) {
  const recentEntries = entries.slice(0, 7).reverse();
  const data = recentEntries.map(e => ({
    date: format(new Date(e.date), 'MMM d'),
    moodScore: e.mood === 'happy' ? 5 : e.mood === 'calm' ? 4 : e.mood === 'tired' ? 3 : e.mood === 'anxious' ? 2 : 1
  }));

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-brand-100 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-brand-900">Mood Trends</h3>
        <span className="text-xs text-brand-500 font-medium">Last 7 entries</span>
      </div>
      <div className="h-40 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="moodScore" 
                stroke="#da6b4d" 
                strokeWidth={3} 
                dot={{ fill: '#da6b4d', r: 4 }} 
              />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 6]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-brand-300 gap-2">
            <Activity className="w-8 h-8 opacity-20" />
            <p className="text-xs">No data yet. Start tracking today!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActions({ onAddMood, onAddFibroid, hasFibroids }: { onAddMood: () => void, onAddFibroid: () => void, hasFibroids: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button 
        onClick={onAddMood}
        className="p-6 rounded-[2rem] bg-white border border-brand-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 items-start group"
      >
        <div className="p-3 rounded-2xl bg-brand-100 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
          <Plus className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h4 className="font-bold text-brand-900">Log Mood</h4>
          <p className="text-xs text-brand-500">Track how you feel</p>
        </div>
      </button>
      {hasFibroids ? (
        <button 
          onClick={onAddFibroid}
          className="p-6 rounded-[2rem] bg-white border border-brand-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 items-start group"
        >
          <div className="p-3 rounded-2xl bg-brand-100 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <Droplets className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-brand-900">Log Fibroids</h4>
            <p className="text-xs text-brand-500">Track symptoms</p>
          </div>
        </button>
      ) : (
        <button className="p-6 rounded-[2rem] bg-white border border-brand-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 items-start group">
          <div className="p-3 rounded-2xl bg-brand-100 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <Coffee className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-brand-900">Care Tips</h4>
            <p className="text-xs text-brand-500">Daily wellness advice</p>
          </div>
        </button>
      )}
    </div>
  );
}

function SymptomHeatmapCalendar({ 
  moodEntries, 
  fibroidEntries,
  selectedDate,
  onSelectDate
}: { 
  moodEntries: MoodEntry[], 
  fibroidEntries: FibroidEntry[],
  selectedDate: string | null,
  onSelectDate: (date: string | null) => void 
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getDayStatus = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const moodEntry = moodEntries.find(e => e.date === dateStr);
    const fibroidEntry = fibroidEntries.find(e => e.date === dateStr);

    if (!moodEntry && !fibroidEntry) {
      return { level: 'none', label: 'No logs' };
    }

    const moodSymptoms = moodEntry?.symptoms || [];
    const fibroidSymptoms = fibroidEntry?.symptoms || [];
    const uniqueSymptoms = Array.from(new Set([...moodSymptoms, ...fibroidSymptoms]));
    const symptomCount = uniqueSymptoms.length;

    const moodPain = moodEntry?.painLevel || 0;
    const fibroidPain = fibroidEntry?.painLevel || 0;
    const maxPain = Math.max(moodPain, fibroidPain);

    const isHeavyBleeding = fibroidEntry?.bleedingIntensity === 'heavy' || fibroidEntry?.bleedingIntensity === 'very-heavy';
    const isMediumBleeding = fibroidEntry?.bleedingIntensity === 'medium';
    const isDifficultMood = moodEntry && ['sad', 'irritable', 'anxious'].includes(moodEntry.mood);

    if (maxPain >= 7 || symptomCount >= 4 || isHeavyBleeding) {
      return { level: 'high', label: 'Severe / High Intensity symptoms/pain' };
    }
    if (maxPain >= 4 || symptomCount >= 2 || isMediumBleeding || (isDifficultMood && symptomCount >= 1)) {
      return { level: 'medium', label: 'Moderate / Medium Intensity symptoms/pain' };
    }
    return { level: 'low', label: 'Mild / Low Intensity symptoms/pain' };
  };

  const getHeatmapClass = (day: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      return 'bg-gray-50/20 text-brand-300 pointer-events-none opacity-20';
    }

    const { level } = getDayStatus(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    const isSelected = selectedDate === dateStr;

    let baseClass = 'w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer relative transition-all duration-200 border ';

    if (isSelected) {
      baseClass += 'ring-2 ring-brand-600 ring-offset-2 scale-110 z-10 shadow-md ';
    } else {
      baseClass += 'hover:scale-105 ';
    }

    if (level === 'high') {
      return baseClass + 'bg-rose-500 text-white border-rose-600';
    }
    if (level === 'medium') {
      return baseClass + 'bg-rose-200 text-rose-900 border-rose-300';
    }
    if (level === 'low') {
      return baseClass + 'bg-rose-50 text-rose-800 border-rose-100';
    }
    
    return baseClass + 'bg-white text-brand-700 border-brand-100 hover:bg-brand-50/60';
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-brand-100 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-brand-50">
        <h3 className="font-serif font-bold text-brand-900 text-base">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1.5">
          <button 
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-full hover:bg-brand-50 text-brand-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-full hover:bg-brand-50 text-brand-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-bold text-brand-400 text-[10px]">
        {weekDays.map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {gridDays.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const dateStr = format(day, 'yyyy-MM-dd');
          const isTodayMarker = format(new Date(), 'yyyy-MM-dd') === dateStr;
          
          return (
            <div 
              key={i} 
              className="flex justify-center items-center py-1 relative"
            >
              <button
                type="button"
                onClick={() => isCurrentMonth && onSelectDate(dateStr)}
                disabled={!isCurrentMonth}
                className={getHeatmapClass(day, isCurrentMonth)}
                title={`${format(day, 'MMM d')}: ${getDayStatus(day).label}`}
              >
                <span>{format(day, 'd')}</span>
                {isTodayMarker && (
                  <span className="absolute bottom-1 w-1 h-0.5 rounded-full bg-brand-600" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-brand-50 flex items-center justify-between text-[10px] text-brand-500 uppercase font-bold tracking-wider">
        <span>Legend:</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-brand-200 inline-block" />
            <span>None</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-50 border border-rose-100 inline-block" />
            <span>Mild</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-200 border border-rose-300 inline-block" />
            <span>Mod</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600 inline-block" />
            <span>Severe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoodTracker({ 
  entries, 
  onAddEntry, 
  fibroidEntries = [],
  autoOpenAdd = false,
  onSetAutoOpenAdd
}: { 
  entries: MoodEntry[], 
  onAddEntry: (entry: MoodEntry) => void,
  fibroidEntries?: FibroidEntry[],
  autoOpenAdd?: boolean;
  onSetAutoOpenAdd?: (val: boolean) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [newEntry, setNewEntry] = useState<Partial<MoodEntry>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    mood: 'calm',
    medication: 'None',
    symptoms: [],
    painLevel: 0
  });

  const moods: { id: MoodEntry['mood'], label: string, icon: string }[] = [
    { id: 'happy', label: 'Happy', icon: '😊' },
    { id: 'calm', label: 'Calm', icon: '😌' },
    { id: 'tired', label: 'Tired', icon: '😴' },
    { id: 'anxious', label: 'Anxious', icon: '😰' },
    { id: 'irritable', label: 'Irritable', icon: '😠' },
    { id: 'sad', label: 'Sad', icon: '😔' },
  ];

  const commonSymptoms = ['Cramps', 'Headache', 'Bloating', 'Acne', 'Nausea', 'Back Pain'];

  const handleSubmit = () => {
    onAddEntry({
      ...newEntry,
      date: newEntry.date || format(new Date(), 'yyyy-MM-dd'),
      mood: newEntry.mood || 'calm',
      medication: newEntry.medication || 'None',
      symptoms: newEntry.symptoms || [],
      painLevel: newEntry.painLevel || 0
    } as MoodEntry);
    setIsAdding(false);
    setNewEntry({
      date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
      mood: 'calm',
      medication: 'None',
      symptoms: [],
      painLevel: 0
    });
  };

  const handleOpenAdd = () => {
    setNewEntry({
      date: selectedDate || format(new Date(), 'yyyy-MM-dd'),
      mood: 'calm',
      medication: 'None',
      symptoms: [],
      painLevel: 0
    });
    setIsAdding(true);
  };

  useEffect(() => {
    if (autoOpenAdd) {
      handleOpenAdd();
      onSetAutoOpenAdd?.(false);
    }
  }, [autoOpenAdd]);

  // Find entries for selected date to show details
  const selectedMoodEntry = entries.find(e => e.date === selectedDate);
  const selectedFibroidEntry = fibroidEntries.find(e => e.date === selectedDate);
  const hasSelectedLogs = selectedMoodEntry || selectedFibroidEntry;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif font-bold text-brand-900">Symptom Tracking</h2>
        <button 
          onClick={handleOpenAdd}
          className="p-2 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all flex items-center gap-1.5 px-4 h-10 text-xs font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          <span>Log Day</span>
        </button>
      </div>

      {/* Heatmap Calendar */}
      <SymptomHeatmapCalendar 
        moodEntries={entries}
        fibroidEntries={fibroidEntries}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Selected Date Summary Display */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-xs font-bold text-brand-500 uppercase tracking-widest">
              Selected: {format(new Date(selectedDate + 'T00:00:00'), 'eeee, MMMM d, yyyy')}
            </h4>
          </div>

          {!hasSelectedLogs ? (
            <div className="bg-brand-50/50 p-6 rounded-[2rem] border border-brand-100 flex flex-col items-center text-center space-y-3">
              <Activity className="w-8 h-8 text-brand-300 opacity-60" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-brand-800">No symptoms logged for this date</p>
                <p className="text-[10px] text-brand-500">Backdate or log symptoms to visual heatmaps.</p>
              </div>
              <button 
                onClick={handleOpenAdd}
                className="py-2.5 px-5 bg-white border border-brand-200 rounded-full text-xs font-bold text-brand-700 hover:bg-brand-50 shadow-sm transition-all"
              >
                Log Symptoms Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {selectedMoodEntry && (
                <div className="bg-white p-6 rounded-[2rem] border border-brand-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">
                      {moods.find(m => m.id === selectedMoodEntry.mood)?.icon || '😌'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-900 capitalize">{selectedMoodEntry.mood} Mood</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-[9px] font-bold text-brand-600">
                          {selectedMoodEntry.medication}
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Mood & General Track</p>
                    </div>
                  </div>

                  {selectedMoodEntry.painLevel !== undefined && selectedMoodEntry.painLevel > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 bg-brand-50/50 p-3 rounded-xl border border-brand-100/50">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>General Pain / Discomfort Intensity: <strong className="text-brand-900">{selectedMoodEntry.painLevel}/10</strong></span>
                    </div>
                  )}

                  {selectedMoodEntry.symptoms.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Logged Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMoodEntry.symptoms.map(s => (
                          <span key={s} className="text-[10px] px-2.5 py-1 rounded-lg bg-brand-100 text-brand-800 font-medium font-sans">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedFibroidEntry && (
                <div className="bg-white p-6 rounded-[2rem] border border-brand-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-rose-50 text-rose-600 rounded-2xl">
                      <Droplets className="w-6 h-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-brand-900">Uterine Fibroids Log</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[9px] font-bold capitalize text-rose-700">
                          {selectedFibroidEntry.bleedingIntensity} bleeding
                        </span>
                      </div>
                      <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Fibroid tracking module</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 bg-rose-50/20 p-3 rounded-xl border border-rose-100/30">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <span>Fibroid Pain Level: <strong className="text-rose-900">{selectedFibroidEntry.painLevel}/10</strong></span>
                  </div>

                  {selectedFibroidEntry.symptoms.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedFibroidEntry.symptoms.map(s => (
                          <span key={s} className="text-[10px] px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-medium font-sans">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFibroidEntry.notes && (
                    <p className="text-xs text-brand-600 italic border-l-2 border-brand-200 pl-3">
                      "{selectedFibroidEntry.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Log Modal/Drawer */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl border border-brand-100 space-y-6"
          >
            <div className="flex justify-between items-center border-b border-brand-50 pb-2">
              <h3 className="font-serif font-bold text-brand-900">Log New Daily Entry</h3>
              <span className="text-xs font-bold text-brand-500">{newEntry.date}</span>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">Date of Log</label>
              <input 
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none bg-white font-medium text-brand-800"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">How are you feeling?</label>
              <div className="grid grid-cols-3 gap-3">
                {moods.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setNewEntry({ ...newEntry, mood: m.id })}
                    className={cn(
                      "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                      newEntry.mood === m.id ? "border-brand-600 bg-brand-50" : "border-brand-50 bg-white"
                    )}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <span className="text-[10px] font-bold uppercase">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-700">Pain/Discomfort Intensity</label>
                <span className="text-xs font-extrabold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-md">
                  {newEntry.painLevel || 0}/10
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                value={newEntry.painLevel || 0}
                onChange={(e) => setNewEntry({ ...newEntry, painLevel: parseInt(e.target.value) || 0 })}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <p className="text-[9px] text-brand-400 leading-relaxed font-semibold italic">0 indicates no physical pain, while 10 represents extreme cramping or discomfort.</p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">Current Medication / Method</label>
              <select 
                value={newEntry.medication}
                onChange={(e) => setNewEntry({ ...newEntry, medication: e.target.value })}
                className="w-full p-4 rounded-2xl border-2 border-brand-100 focus:border-brand-400 outline-none bg-white"
              >
                {FAMILY_PLANNING_MEDS.map(med => (
                  <option key={med} value={med}>{med}</option>
                ))}
              </select>
              <p className="text-[10px] text-brand-500 italic">Tracking contraceptive habits and supplements clarifies physical responses.</p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-brand-700">Symptoms</label>
              <div className="flex flex-wrap gap-2">
                {commonSymptoms.map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => {
                      const current = newEntry.symptoms || [];
                      if (current.includes(s)) {
                        setNewEntry({ ...newEntry, symptoms: current.filter(x => x !== s) });
                      } else {
                        setNewEntry({ ...newEntry, symptoms: [...current, s] });
                      }
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-medium transition-all",
                      newEntry.symptoms?.includes(s) ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-4 rounded-2xl border-2 border-brand-100 font-bold text-brand-500"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                className="flex-2 py-4 rounded-2xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-200"
              >
                Save Log
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historical Timeline Logs Feed */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest px-2">Logging Timeline</h3>
        {entries.length === 0 ? (
          <div className="p-12 text-center space-y-4 opacity-45 bg-white rounded-[2rem] border border-brand-100">
            <Activity className="w-12 h-12 mx-auto text-brand-300" />
            <p className="text-xs font-semibold text-brand-500">No logs saved yet. Tap "Log Day" above or click a day in the heatmap to begin.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedDate(entry.date)}
                className={cn(
                  "bg-white p-6 rounded-[2rem] shadow-sm border transition-all cursor-pointer flex gap-4 items-start hover:shadow-md",
                  selectedDate === entry.date ? "border-brand-500 ring-1 ring-brand-100" : "border-brand-100"
                )}
              >
                <div className="text-3xl">
                  {moods.find(m => m.id === entry.mood)?.icon || '😌'}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-brand-900 capitalize">{entry.mood}</h4>
                      <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">
                        {format(new Date(entry.date + 'T00:00:00'), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-brand-50 text-[10px] font-bold text-brand-600 border border-brand-100 capitalize">
                      {entry.medication}
                    </div>
                  </div>
                  
                  {entry.painLevel !== undefined && entry.painLevel > 0 && (
                    <div className="text-[10px] font-semibold text-brand-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>Pain: <strong className="text-brand-800">{entry.painLevel}/10</strong></span>
                    </div>
                  )}

                  {entry.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.symptoms.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-brand-100 text-brand-700">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecoveryCenter({ 
  userData, 
  onUpdateUserData 
}: { 
  userData: UserData; 
  onUpdateUserData: (data: UserData) => void;
}) {
  const [activeSection, setActiveSection] = useState<'nutrition' | 'meds' | 'care' | 'ai'>('nutrition');
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Checkout overlay states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'processing' | 'success'>('form');
  const [paymentName, setPaymentName] = useState(userData?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [processingStage, setProcessingStage] = useState('Initializing payments platform...');

  const isUnlocked = userData?.isPremiumUnlocked === true;

  const getAiAdvice = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setAiResponse(null);
    
    try {
      const response = await fetch("/api/get-ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error("Failed response from health assistant.");
      }
      const data = await response.json();
      setAiResponse(data.text || "I'm sorry, I couldn't generate advice at this time. Please try again or consult your doctor.");
    } catch (error) {
      console.error("AI Advice Error:", error);
      setAiResponse("I encountered an error while trying to help. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCheckout = () => {
    setPaymentError('');
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setPaymentName(userData?.name || '');
    setCheckoutStep('form');
    setIsCheckoutOpen(true);
  };

  const handleProcessPayment = () => {
    if (!cardNumber.trim() || !expiry.trim() || !cvc.trim()) {
      setPaymentError("Please provide all card details.");
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 12) {
      setPaymentError("Please enter a valid credit card number.");
      return;
    }
    setPaymentError('');
    setCheckoutStep('processing');
    
    setProcessingStage('Opening secure 256-bit gateway...');
    setTimeout(() => {
      setProcessingStage('Authorizing $2.00 deposit with bank...');
      setTimeout(() => {
        setProcessingStage('Provisioning premium companion license...');
        setTimeout(() => {
          setCheckoutStep('success');
          onUpdateUserData({
            ...userData,
            isPremiumUnlocked: true
          });
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="space-y-6 relative">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-serif font-bold text-brand-900">Recovery Support</h2>
          <div className="flex items-center gap-1 px-3 py-1 bg-brand-100 rounded-full">
            <Sparkles className="w-3 h-3 text-brand-600 animate-pulse" />
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Premium Access</span>
          </div>
        </div>
        <p className="text-sm text-brand-600">Gentle companion resources for procedural healing and holistic wellbeing.</p>
      </div>

      <div className="flex p-1 bg-brand-100 rounded-2xl overflow-x-auto">
        {(['nutrition', 'meds', 'care', 'ai'] as const).map(s => {
          const isPaidTab = s === 'nutrition' || s === 'meds';
          return (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={cn(
                "flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1",
                activeSection === s ? "bg-white text-brand-600 shadow-sm" : "text-brand-400"
              )}
            >
              {s === 'ai' ? 'AI Advice' : s}
              {isPaidTab && !isUnlocked && (
                <Lock className="w-2.5 h-2.5 text-brand-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* NUTRITION SECTION */}
        {activeSection === 'nutrition' && (
          <motion.div
            key="nutrition"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {!isUnlocked ? (
              // NUTRITION PAYWALL CARD
              <div className="bg-white rounded-[2rem] p-8 border border-brand-100 shadow-sm space-y-6 text-center">
                <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner relative">
                  <Coffee className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 bg-brand-600 text-white p-1 rounded-full text-[8px]">
                    <Lock className="w-2 h-2" />
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-serif font-bold text-brand-900">Healing Nutrition Guide</h3>
                  <p className="text-xs text-brand-600 leading-relaxed max-w-xs mx-auto">
                    Unlock professional, iron-rich, comfort recovery menu layouts designed to replenish nutrients, boost vitality, and support tissue healing.
                  </p>
                </div>
                <div className="bg-brand-50/50 p-4 rounded-2xl text-left border border-brand-100/50 space-y-2.5 max-w-sm mx-auto">
                  <div className="flex items-start gap-2.5 text-[11px] text-brand-700 font-bold">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" />
                    <span>Iron-dense nourishing recovery plates</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[11px] text-brand-700 font-bold">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" />
                    <span>Anti-inflammatory lunches & snacks</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[11px] text-brand-700 font-bold">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" />
                    <span>Holistic system replenishment guides</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-200/50 hover:bg-brand-700 transition-all text-xs uppercase tracking-wider"
                >
                  Unlock Recovery Bundle ($2.00)
                </button>
                <p className="text-[10px] text-brand-400 font-medium">Includes Food and Medication recovery guides • One-time charge</p>
              </div>
            ) : (
              // NUTRITION UNLOCKED CONTENT
              <>
                <div className="p-4 rounded-2xl bg-brand-600 text-white flex gap-4 items-center">
                  <Coffee className="w-6 h-6 shrink-0" />
                  <p className="text-xs font-medium">Focus on iron-rich foods and hydration to help your body replenish and heal.</p>
                </div>
                {MEAL_SUGGESTIONS.map(meal => (
                  <div key={meal.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-brand-900">{meal.title}</h4>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-brand-50 text-brand-600 font-bold uppercase">{meal.category}</span>
                    </div>
                    <p className="text-sm text-brand-600">{meal.description}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {meal.benefits.map(b => (
                        <span key={b} className="text-[10px] flex items-center gap-1 text-brand-500">
                          <CheckCircle2 className="w-3 h-3 text-brand-400" />
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}

        {/* MEDS SECTION */}
        {activeSection === 'meds' && (
          <motion.div
            key="meds"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {!isUnlocked ? (
              // MEDS PAYWALL CARD
              <div className="bg-white rounded-[2rem] p-8 border border-brand-100 shadow-sm space-y-6 text-center">
                <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner relative">
                  <Pill className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 bg-brand-600 text-white p-1 rounded-full text-[8px]">
                    <Lock className="w-2 h-2" />
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-serif font-bold text-brand-900">Medication & Relief Guide</h3>
                  <p className="text-xs text-brand-600 leading-relaxed max-w-xs mx-auto">
                    Understand clinical suggestions for non-prescription pain relievers, safe intervals, cramps mitigation, and hormonal comfort aids.
                  </p>
                </div>
                <div className="bg-brand-50/50 p-4 rounded-2xl text-left border border-brand-100/50 space-y-2.5 max-w-sm mx-auto">
                  <div className="flex items-start gap-2.5 text-[11px] text-brand-700 font-bold">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" />
                    <span>Evidence-backed dosage & frequency support</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[11px] text-brand-700 font-bold">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" />
                    <span>Holistic comfort/supplement details</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[11px] text-brand-700 font-bold">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-brand-600 shrink-0" />
                    <span>Discomfort & recovery relief schedules</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-200/50 hover:bg-brand-700 transition-all text-xs uppercase tracking-wider"
                >
                  Unlock Recovery Bundle ($2.00)
                </button>
                <p className="text-[10px] text-brand-400 font-medium">Includes Food and Medication recovery guides • One-time charge</p>
              </div>
            ) : (
              // MEDS UNLOCKED CONTENT
              <>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex gap-4 items-start">
                  <Info className="w-6 h-6 shrink-0 text-amber-600" />
                  <p className="text-xs font-medium">Always consult with your healthcare provider before starting any medication. This is general guidance for comfort.</p>
                </div>
                {RECOVERY_MEDS.map(med => (
                  <div key={med.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-100 space-y-2">
                    <h4 className="font-bold text-brand-900">{med.name}</h4>
                    <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">{med.purpose}</p>
                    <p className="text-sm text-brand-600 leading-relaxed">{med.advice}</p>
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}

        {/* FREE CARE ITEMS */}
        {activeSection === 'care' && (
          <motion.div
            key="care"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-brand-100 space-y-6">
              <div className="text-center space-y-2">
                <MessageCircleHeart className="w-12 h-12 mx-auto text-brand-400" />
                <h3 className="text-xl font-serif font-bold text-brand-900">Emotional Well-being</h3>
                <p className="text-sm text-brand-600 font-sans">Healing is not just physical. It's okay to feel a range of emotions.</p>
              </div>
              <ul className="space-y-4">
                {[
                  "Rest as much as possible for the first 48 hours.",
                  "Avoid heavy lifting or strenuous exercise for a week.",
                  "Stay hydrated with water, herbal teas, and broths.",
                  "Reach out to trusted friends or professional counselors if you need to talk.",
                  "Monitor your temperature and watch for signs of infection (fever, heavy bleeding)."
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm text-brand-700">
                    <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-brand-600">{i + 1}</span>
                    </div>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* AI DIALOGS */}
        {activeSection === 'ai' && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            {/* AI ADVICE UNLOCKED CONTENT */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-100 space-y-4">
              <div className="space-y-2">
                <h3 className="font-bold text-brand-900 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-brand-600 animate-pulse" />
                  Personalized Recovery Advice
                </h3>
                <p className="text-xs text-brand-500">Describe how you&apos;re feeling or any specific concerns you have during your recovery.</p>
              </div>
              
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., I'm feeling very tired and have some mild cramping. What should I eat to feel better?"
                  className="w-full p-4 pr-12 rounded-2xl bg-brand-50 border-none outline-none focus:ring-2 ring-brand-200 transition-all text-sm h-32 resize-none"
                />
                <button
                  type="button"
                  onClick={getAiAdvice}
                  disabled={isLoading || !query.trim()}
                  className="absolute bottom-4 right-4 p-2 rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200 disabled:opacity-50 transition-all"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand-100 space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-brand-50">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                  </div>
                  <span className="text-xs font-bold text-brand-900">LunaCare AI Assistant</span>
                </div>
                <div className="markdown-body text-sm text-brand-700 leading-relaxed font-sans">
                  <Markdown>{aiResponse}</Markdown>
                </div>
                <div className="pt-4 border-t border-brand-50">
                  <p className="text-[10px] text-brand-400 italic">This advice is generated by AI and is for informational purposes only. Always consult with a healthcare professional for medical concerns.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECURE CHECKOUT SHEET */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 backdrop-blur-sm">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => checkoutStep !== 'processing' && setIsCheckoutOpen(false)} />
            
            <motion.div 
              initial={{ y: 400, opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 400, opacity: 0.5 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl border-t border-brand-100 p-6 space-y-6 z-10 mr-0.5 ml-0.5"
            >
              {/* Drawer handle indicator */}
              <div className="w-12 h-1 bg-brand-100 rounded-full mx-auto" />

              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-brand-50">
                <div>
                  <h3 className="font-serif font-black text-brand-900 text-lg">LunaCare Checkout</h3>
                  <p className="text-[10px] text-brand-400 font-extrabold uppercase tracking-wider">Premium Companion Package</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-brand-700 block">$2.00</span>
                  <span className="text-[8px] text-brand-400 font-bold uppercase">One-time payment</span>
                </div>
              </div>

              {checkoutStep === 'form' && (
                <div className="space-y-4">
                  {/* Credit Card Graphic container */}
                  <div className="bg-gradient-to-tr from-brand-800 to-brand-600 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest font-black text-brand-200">Luna Premium Pass</span>
                        <p className="text-xs font-bold tracking-wider mt-1">Procedural companion suite</p>
                      </div>
                      <Sparkles className="w-5 h-5 text-brand-300 animate-pulse" />
                    </div>
                    
                    <div className="mt-8">
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="font-sans opacity-70 text-[9px] mr-1 uppercase">CARD:</span>
                        {cardNumber ? (
                          cardNumber.replace(/\s?/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
                        ) : (
                          '•••• •••• •••• 4004'
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-brand-300 font-bold">Holder</span>
                        <p className="text-xs font-bold uppercase tracking-wider truncate max-w-[150px]">{paymentName || 'Luna Guest'}</p>
                      </div>
                      <div className="text-right flex gap-3 items-end">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-brand-300 font-bold block">Expiry</span>
                          <span className="text-xs font-bold font-mono">{expiry || '09/30'}</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-brand-300 font-bold block">CVC</span>
                          <span className="text-xs font-bold font-mono">{cvc || '•••'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Fields */}
                  {paymentError && (
                    <p className="p-3 text-[11px] rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">{paymentError}</p>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest">Cardholder Name</label>
                      <input 
                        type="text"
                        value={paymentName}
                        onChange={(e) => setPaymentName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full p-3.5 rounded-xl border border-brand-100 focus:border-brand-500 outline-none text-xs font-semibold text-brand-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest">Card Number</label>
                      <div className="relative">
                        <input 
                          type="text"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            // Basic formatting
                            const trimmed = e.target.value.replace(/\D/g, '');
                            const matches = trimmed.match(/.{1,4}/g);
                            setCardNumber(matches ? matches.join(' ') : trimmed);
                          }}
                          placeholder="4111 2222 3333 4004"
                          className="w-full p-3.5 pr-10 rounded-xl border border-brand-100 focus:border-brand-500 outline-none text-xs font-semibold font-mono text-brand-800"
                        />
                        <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest">Expiration</label>
                        <input 
                          type="text"
                          maxLength={5}
                          value={expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) {
                              val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            }
                            setExpiry(val);
                          }}
                          placeholder="MM/YY"
                          className="w-full p-3.5 rounded-xl border border-brand-100 focus:border-brand-500 outline-none text-xs font-semibold font-mono text-brand-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest">CVC Code</label>
                        <input 
                          type="password"
                          maxLength={3}
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                          placeholder="•••"
                          className="w-full p-3.5 rounded-xl border border-brand-100 focus:border-brand-500 outline-none text-xs font-semibold font-mono text-brand-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2 text-[9px] font-bold text-brand-400 items-start leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Secure Stripe-simulated sandbox environment. Your real details are completely protected on your client device.</span>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="flex-1 py-3.5 rounded-xl border border-brand-200 text-xs font-extrabold text-brand-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPayment}
                      className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-brand-100-50"
                    >
                      Pay $2.00
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'processing' && (
                <div className="py-12 flex flex-col items-center text-center space-y-4">
                  <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-brand-900 uppercase tracking-wider">Securing Transaction...</p>
                    <p className="text-[11px] text-brand-500 font-semibold">{processingStage}</p>
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="py-8 flex flex-col items-center text-center space-y-5">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-md animate-bounce">
                    <Check className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif font-black text-brand-900 text-lg">Premium Unlocked!</h4>
                    <p className="text-xs text-brand-600 leading-relaxed max-w-xs">
                      Thank you! You now have limitless lifetime access to personalized nutrition, comfort medication advice, and the Companion AI assistant.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="py-3 px-10 bg-brand-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-850"
                  >
                    Start Exploring Premium
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsView({ 
  userData, 
  onUpdate,
  onTriggerTestNotification
}: { 
  userData: UserData, 
  onUpdate: (data: UserData) => void,
  onTriggerTestNotification?: () => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-brand-900">Profile Settings</h2>
      
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-brand-100 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-brand-400 uppercase tracking-widest">Name</label>
          <input 
            type="text" 
            value={userData.name}
            onChange={(e) => onUpdate({ ...userData, name: e.target.value })}
            className="w-full p-4 rounded-2xl bg-brand-50 border-none outline-none focus:ring-2 ring-brand-200 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-400 uppercase tracking-widest">Cycle Length</label>
            <input 
              type="number" 
              value={userData.cycleLength}
              onChange={(e) => onUpdate({ ...userData, cycleLength: parseInt(e.target.value) })}
              className="w-full p-4 rounded-2xl bg-brand-50 border-none outline-none focus:ring-2 ring-brand-200 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-400 uppercase tracking-widest">Period Length</label>
            <input 
              type="number" 
              value={userData.periodLength}
              onChange={(e) => onUpdate({ ...userData, periodLength: parseInt(e.target.value) })}
              className="w-full p-4 rounded-2xl bg-brand-50 border-none outline-none focus:ring-2 ring-brand-200 transition-all"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-brand-50">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-brand-900">Uterine Fibroids Tracking</h4>
              <p className="text-[10px] text-brand-500">Enable specialized tools for fibroids.</p>
            </div>
            <button 
              onClick={() => onUpdate({ ...userData, hasFibroids: !userData.hasFibroids })}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                userData.hasFibroids ? "bg-brand-600" : "bg-brand-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                userData.hasFibroids ? "left-7" : "left-1"
              )} />
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-brand-50">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-brand-900">Daily Symptom Reminders</h4>
              <p className="text-[10px] text-brand-500">Alert to log hormones & symptoms daily.</p>
            </div>
            <button 
              onClick={() => {
                const updatedVal = !userData.notificationsEnabled;
                onUpdate({ ...userData, notificationsEnabled: updatedVal });
                if (updatedVal && 'Notification' in window) {
                  Notification.requestPermission();
                }
              }}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                userData.notificationsEnabled ? "bg-brand-600" : "bg-brand-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                userData.notificationsEnabled ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          {userData.notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2 bg-brand-50/40 p-4 rounded-2xl border border-brand-100/50 mt-1 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <label className="font-bold text-brand-800 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-brand-500" />
                  <span>Reminder Time:</span>
                </label>
                <input 
                  type="time" 
                  value={userData.notificationTime || "20:00"}
                  onChange={(e) => onUpdate({ ...userData, notificationTime: e.target.value })}
                  className="p-2 py-1.5 rounded-xl bg-white border border-brand-200 outline-none focus:ring-2 ring-brand-200 text-xs font-bold text-brand-800 transition-all text-center"
                />
              </div>
              <p className="text-[9px] text-brand-500 leading-normal">
                *Triggers an in-app check-in banner, as well as a browser push alert if permitted.
              </p>
            </motion.div>
          )}

          <div className="flex justify-between items-center pt-2 bg-brand-50/50 p-3 rounded-xl border border-brand-100/40">
            <span className="text-[9px] font-extrabold text-brand-500 uppercase tracking-widest">Notification Preview:</span>
            <button
              type="button"
              onClick={onTriggerTestNotification}
              className="text-[9px] text-brand-600 hover:text-brand-800 font-extrabold underline uppercase tracking-wider flex items-center gap-1"
            >
              <Bell className="w-2.5 h-2.5" /> Trigger Simulated Prompt
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-brand-50">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-brand-900">Premium Copilot Upgrade</h4>
              <p className="text-[10px] text-brand-500">
                {userData.isPremiumUnlocked ? "Active lifetime access" : "Food and Medication recovery guides ($2)"}
              </p>
            </div>
            {userData.isPremiumUnlocked ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-100 flex items-center gap-1 shrink-0 animate-pulse">
                <Check className="w-3 h-3" /> Unlocked
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-100 shrink-0">
                Standard
              </span>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 bg-brand-50/50 p-3 rounded-xl border border-brand-100/40">
            <span className="text-[9px] font-extrabold text-brand-500 uppercase tracking-widest">Tester quick check:</span>
            <button
              type="button"
              onClick={() => onUpdate({ ...userData, isPremiumUnlocked: !userData.isPremiumUnlocked })}
              className="text-[9px] text-brand-600 hover:text-brand-800 font-extrabold underline uppercase tracking-wider"
            >
              Instantly toggle: {userData.isPremiumUnlocked ? "Lock Premium" : "Unlock Premium"}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-brand-50">
          <button 
            onClick={() => {
              if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full py-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-2xl transition-colors"
          >
            Reset All Data
          </button>
        </div>
      </div>

      <div className="p-6 rounded-[2rem] bg-brand-900 text-brand-100 space-y-2">
        <h4 className="font-bold text-white">Privacy First</h4>
        <p className="text-xs leading-relaxed opacity-80">Your health data is stored locally on your device. We do not sell or share your personal information with third parties.</p>
      </div>
    </div>
  );
}
