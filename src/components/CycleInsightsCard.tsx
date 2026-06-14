import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Calendar, 
  Loader2, 
  Activity, 
  Heart, 
  Coffee, 
  Compass, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  BrainCircuit
} from 'lucide-react';
import { UserData, MoodEntry, FibroidEntry } from '../types';

type PredictionItem = {
  title: string;
  detail: string;
  type: 'period' | 'ovulation' | 'symptom' | 'pattern';
};

type AdviceItem = {
  category: 'nutrition' | 'activity' | 'care';
  title: string;
  description: string;
};

type InsightData = {
  cycleStatus: string;
  summary: string;
  predictions: PredictionItem[];
  wellnessAdvice: AdviceItem[];
};

interface CycleInsightsCardProps {
  userData: UserData;
  moodEntries: MoodEntry[];
  fibroidEntries: FibroidEntry[];
}

export default function CycleInsightsCard({ userData, moodEntries, fibroidEntries }: CycleInsightsCardProps) {
  const [insights, setInsights] = useState<InsightData | null>(() => {
    const saved = localStorage.getItem('luna_cycle_insights');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAdvice, setExpandedAdvice] = useState<number | null>(null);

  const fetchInsights = async (force = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cycle-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, moodEntries, fibroidEntries }),
      });
      if (!response.ok) {
        throw new Error('Could not fetch personalized cycle analysis');
      }
      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
        localStorage.setItem('luna_cycle_insights', JSON.stringify(data.insights));
      } else {
        throw new Error('Analysis payload was incomplete');
      }
    } catch (err: any) {
      console.error('Insights error:', err);
      setError(err.message || 'Unable to load cycle predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!insights) {
      fetchInsights();
    }
  }, [userData.lastPeriodDate, userData.cycleLength, userData.periodLength]);

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'period':
        return <Calendar className="w-5 h-5 text-rose-500" />;
      case 'ovulation':
        return <Compass className="w-5 h-5 text-emerald-500" />;
      case 'symptom':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-brand-500" />;
    }
  };

  const getAdviceIcon = (category: string) => {
    switch (category) {
      case 'nutrition':
        return <Coffee className="w-5 h-5 text-emerald-600" />;
      case 'activity':
        return <Activity className="w-5 h-5 text-violet-600" />;
      default:
        return <Heart className="w-5 h-5 text-rose-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nutrition':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'activity':
        return 'bg-violet-50 text-violet-700 border-violet-100';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  return (
    <div id="ai-cycle-insights-card" className="bg-white rounded-[2rem] p-6 shadow-sm border border-brand-100 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-brand-50 rounded-2xl text-brand-600 shadow-inner">
            <Sparkles className="w-5 h-5 text-brand-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-brand-900 leading-tight">AI Cycle Forecaster</h3>
            <span className="text-[10px] uppercase font-black tracking-wider text-brand-400">Personalized Insights</span>
          </div>
        </div>
        
        <button
          onClick={() => fetchInsights(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          )}
          <span>{loading ? 'Analyzing...' : 'Recalculate'}</span>
        </button>
      </div>

      {loading && !insights && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs text-brand-600 font-medium">Analyzing historical entries & physiological patterns...</p>
        </div>
      )}

      {error && !insights && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="space-y-1 text-xs">
            <p className="font-bold">Failed to load prediction analysis</p>
            <p>{error}</p>
            <button 
              onClick={() => fetchInsights(true)}
              className="underline text-[11px] font-black uppercase tracking-wider block pt-1 hover:text-rose-900"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {insights && (
        <div className="space-y-5 animate-fade-in">
          {/* Status Badge */}
          <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4 flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-brand-400 block">Identified Phase</span>
              <p className="font-serif font-bold text-base text-brand-900">{insights.cycleStatus}</p>
            </div>
            <div className="p-2 bg-white rounded-xl shadow-sm border border-brand-100/50">
              <BrainCircuit className="w-5 h-5 text-brand-600" />
            </div>
          </div>

          {/* Core compassionate Summary Narrative */}
          <div className="bg-gradient-to-br from-brand-50/20 to-brand-100/10 border-l-4 border-brand-500 p-4 rounded-r-2xl space-y-1">
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">Symptom Trend Analysis</span>
            <p className="text-xs text-brand-700 leading-relaxed italic">
              "{insights.summary}"
            </p>
          </div>

          {/* Predictions block */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-400">Personalized Forecast</h4>
            <div className="grid grid-cols-1 gap-2.5">
              {insights.predictions.map((p, idx) => (
                <div 
                  key={idx} 
                  className="bg-white hover:bg-brand-50/30 border border-brand-100 rounded-2xl p-3 flex gap-3.5 items-center transition-all duration-300"
                >
                  <div className="p-2.5 bg-brand-50/50 rounded-xl shrink-0 border border-brand-100/20">
                    {getPredictionIcon(p.type)}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-xs text-brand-900 truncate">{p.title}</p>
                    <p className="text-[11px] text-brand-500 leading-snug">{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wellness advice list */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-400">Daily Wellbeing advice</h4>
            <div className="space-y-2">
              {insights.wellnessAdvice.map((advice, idx) => {
                const isExpanded = expandedAdvice === idx;
                return (
                  <div 
                    key={idx}
                    className="border border-brand-100 rounded-2xl overflow-hidden bg-white shadow-xs transition-all"
                  >
                    <button
                      onClick={() => setExpandedAdvice(isExpanded ? null : idx)}
                      className="w-full p-3.5 flex justify-between items-center text-left hover:bg-brand-50/20 transition-all font-sans"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${getCategoryColor(advice.category)}`}>
                          {getAdviceIcon(advice.category)}
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-600 mr-2">
                            {advice.category}
                          </span>
                          <span className="font-bold text-xs text-brand-900 block mt-0.5">{advice.title}</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-brand-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-brand-50/50 bg-brand-50/10 text-xs text-brand-600 leading-relaxed font-sans">
                            {advice.description}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
