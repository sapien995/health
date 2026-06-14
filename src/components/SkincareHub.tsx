import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Sun, Moon, Check, Droplets, Info, Plus, 
  Award, AlertCircle, Heart, Camera, Trash2, TrendingUp, 
  Calendar, RotateCcw, Image as ImageIcon, ChevronRight, LayoutGrid, Zap
} from 'lucide-react';
import { UserData } from '../types';
import { format, parseISO } from 'date-fns';

type SkinDiaryEntry = {
  date: string; // "yyyy-MM-dd"
  glowRating: number; // 1-5
  routinesCompleted: ('am' | 'pm')[];
  completedAmSteps?: string[];
  completedPmSteps?: string[];
  breakoutLevel: 'none' | 'minor' | 'moderate' | 'cystic';
  notes: string;
  photo?: string; // base64 resized compressed JPEG
};

const SKIN_TONES = [
  { id: 'fair', label: 'Fair (Type I-II)', desc: 'High sunburn sensitivity. Prone to redness, early photo-aging, & irritation.', color: '#FFDFD4' },
  { id: 'light', label: 'Light/Medium (Type III)', desc: 'Burns moderately. Responsive to sun-spots, benefits from Vitamin C.', color: '#F3D2C0' },
  { id: 'medium', label: 'Medium/Tan (Type IV)', desc: 'Tans easily. Prone to mild hyperpigmentation. Focus on barrier hydration.', color: '#E1B195' },
  { id: 'olive', label: 'Olive/Rich (Type V)', desc: 'Very prone to darkening & acne scarring (PIH). Niacinamide & Aztec acids are ideal.', color: '#C39476' },
  { id: 'dark-brown', label: 'Dark Brown (Type VI)', desc: 'Deep rich melatonin levels. Highly prone to ashiness & post-inflammatory spots.', color: '#8D5A36' },
  { id: 'deep-black', label: 'Deep Espresso (Type VI+)', desc: 'Thicker skin barrier, resilient but prone to keloids & localized dryness.', color: '#5A3825' }
] as const;

const SKIN_TYPES = [
  { id: 'oily', label: 'Oily', desc: 'Excess sebum, enlarged pores, shine throughout the day.' },
  { id: 'dry', label: 'Dry', desc: 'Flakiness, tightness, dull skin, needs rich lipid barriers.' },
  { id: 'combination', label: 'Combination', desc: 'Oily T-zone (forehead, nose) with dry/normal cheeks.' },
  { id: 'sensitive', label: 'Sensitive', desc: 'Eczema-prone, reactive, prone to burning or redness.' },
  { id: 'normal', label: 'Normal', desc: 'Balanced hydration and moisture. Healthy natural barrier.' }
] as const;

function getCyclePhase(lastPeriodDateStr: string, cycleLength: number, periodLength: number) {
  const lastPeriodDate = new Date(lastPeriodDateStr);
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = today.getTime() - lastPeriodDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Normalize date to cycle length
  const cycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;
  
  let phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' = 'follicular';
  let phaseName = 'Follicular Phase';
  let description = 'Estrogen levels are rising, skin hydration improvement is high. Great time to promote renewal and skin brightening!';
  
  if (cycleDay <= periodLength) {
    phase = 'menstrual';
    phaseName = 'Menstrual Phase';
    description = 'Estrogen and progesterone are at their lowest. The skin and body are more sensitive and moisture levels drop, meaning deeper hydration is required.';
  } else if (cycleDay <= 12) {
    phase = 'follicular';
    phaseName = 'Follicular Phase';
    description = 'Estrogen begins rising rapidly. Your skin is naturally more vibrant, plumb, and glowing, absorbing active ingredients very efficiently.';
  } else if (cycleDay <= 16) {
    phase = 'ovulatory';
    phaseName = 'Ovulatory Phase';
    description = 'Estrogen peaks, and testosterone levels rise. Skin is usually at its peak radiance. Light hydration and continuous sebum protection are ideal.';
  } else {
    phase = 'luteal';
    phaseName = 'Luteal Phase';
    description = 'Progesterone peaks, triggering excess sebum production which can lead to clogged pores and monthly hormonal breakouts.';
  }
  
  return { cycleDay, phase, phaseName, description };
}

export default function SkincareHub({ 
  userData, 
  onUpdateUserData 
}: { 
  userData: UserData;
  onUpdateUserData: (data: UserData) => void;
}) {
  const [skinTab, setSkinTab] = useState<'profile' | 'routine' | 'tracker' | 'progress'>('routine');
  
  // Local diary state loaded from localStorage & Server
  const [skinDiary, setSkinDiary] = useState<SkinDiaryEntry[]>(() => {
    const saved = localStorage.getItem('luna_skin_diary');
    return saved ? JSON.parse(saved) : [];
  });

  const [newLog, setNewLog] = useState<Partial<SkinDiaryEntry>>({
    glowRating: 4,
    routinesCompleted: [],
    breakoutLevel: 'none',
    notes: ''
  });

  const [completedAmSteps, setCompletedAmSteps] = useState<string[]>([]);
  const [completedPmSteps, setCompletedPmSteps] = useState<string[]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs for camera element
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Sync from server on mount
    fetch('/api/skincare')
      .then(res => res.json())
      .then(data => {
        if (data.entries && data.entries.length > 0) {
          setSkinDiary(data.entries);
          localStorage.setItem('luna_skin_diary', JSON.stringify(data.entries));
        } else {
          // Send offline backup entries to server to initialize
          const saved = localStorage.getItem('luna_skin_diary');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.length > 0) {
              setSkinDiary(parsed);
              fetch('/api/skincare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: parsed })
              }).catch(err => console.error("Skincare server migration failed:", err));
            }
          }
        }
      })
      .catch(err => console.error("GET /api/skincare failed, running on persistent cache:", err));
  }, []);

  useEffect(() => {
    localStorage.setItem('luna_skin_diary', JSON.stringify(skinDiary));
  }, [skinDiary]);

  // Clean raw stream tracks on unmount 
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const cycleInfo = userData.lastPeriodDate 
    ? getCyclePhase(userData.lastPeriodDate, userData.cycleLength, userData.periodLength)
    : null;

  const handleSaveProfile = (type: UserData['skinType'], tone: UserData['skinTone']) => {
    onUpdateUserData({
      ...userData,
      skinType: type,
      skinTone: tone
    });
    setSkinTab('routine');
  };

  // Routine generator based on Skin Type, Tone, and Cycle Phase
  const getCustomRoutine = () => {
    const type = userData.skinType || 'normal';
    const tone = userData.skinTone || 'medium';
    const phase = cycleInfo?.phase || 'follicular';

    let amSteps: string[] = [];
    let pmSteps: string[] = [];
    let specialIngredient = '';
    let warningTip = '';

    // Step generation by Skin Type
    switch (type) {
      case 'oily':
        amSteps = [
          'Salicylic Acid Gel Cleanser (breaks down excess oils)',
          'Niacinamide Serum (reduces oil production & tightens pores)',
          'Oil-Free Lightweight Gel Cream',
          'Broad-Spectrum Fluid SPF 50+ (Non-comedogenic)'
        ];
        pmSteps = [
          'Double Cleanse: Micellar water followed by Gel Cleanser',
          'Clay Spot Treatment or 2% BHA Exfoliant (3x weekly)',
          'Hydrating Aloe & Green Tea Gel Lotion'
        ];
        specialIngredient = 'Salicylic Acid (BHA) & Zinc';
        break;
      case 'dry':
        amSteps = [
          'Gentle Milk-Based Hydrating Cleanser (No foaming agents)',
          'Hyaluronic Acid Serum on damp skin (retains moisture)',
          'Rich Ceramide barrier replacement barrier cream',
          'Creamy Hydrating SPF 40+ (nourishes dry patch flakes)'
        ];
        pmSteps = [
          'Double Cleanse: Cleansing Oil followed by milky Cleanser',
          'Glycerin & Squalane Restorative Ampoule',
          'Intense Night Sleep Mask / Facial Squalane Oil'
        ];
        specialIngredient = 'Ceramides & Squalane';
        break;
      case 'combination':
        amSteps = [
          'Balanced Gentle Foaming Cleanser',
          'Vitamin C + Niacinamide Blend (brightens and regulates T-zone)',
          'Lightweight Hyaluronic Gel Moisturizer (apply thin layer to oily zones)',
          'Hybrid Fluid SPF 50 (matte finish)'
        ];
        pmSteps = [
          'Double Cleanse: Foaming cleanser with warm water',
          'Gentle Lactic Acid Exfoliant on cheeks (2x weekly)',
          'Barrier Nourishing Lotion (extra layer on dry patches)'
        ];
        specialIngredient = 'Niacinamide & Lactic Acid';
        break;
      case 'sensitive':
        amSteps = [
          'Hypoallergenic Non-foaming wash',
          'Centella Asiatica (Cica) Serum to calm redness',
          'Minimalist barrier lotion containing colloidal oat extract',
          'Physical/Mineral SPF 30+ (Zinc Oxide base, ultra-calming)'
        ];
        pmSteps = [
          'Gentle water rinse or pH-Balanced sensitive cleanser',
          'Soothing Calamine or Cica skin repair balm',
          'Thick hypoallergenic relief overnight cream'
        ];
        specialIngredient = 'Centella Asiatica & Colloidal Oat';
        break;
      case 'normal':
      default:
        amSteps = [
          'Refreshing Water Rinse or pH Balanced Gel Cleanser',
          'Pro-Vitamin B5 or Ascorbic Acid SPF shield booster',
          'Daily Satin Finish Light Moisturizer',
          'Daily Protection Sunscreen SPF 30+'
        ];
        pmSteps = [
          'Cleanser check-up to remove external grime & pollution',
          'Mild Retinol or Rosehip Seed Oil (promotes cell turnover)',
          'Soothing Moisture Guard Face Cream'
        ];
        specialIngredient = 'Vitamin C & Peptides';
        break;
    }

    // Melanin-specific customizations based on Skin Tone
    switch (tone) {
      case 'fair':
      case 'light':
        warningTip = 'Your lighter tone is prone to rosacea, easy sunburn damage, and redness. Mineral SPF with high UVA/UVB ratings is critically important!';
        amSteps[1] = `${amSteps[1]} + Vitamin E Shield`;
        break;
      case 'medium':
        warningTip = 'Balanced melanin level. Prone to dry patches and sun-induced freckling. Use robust antioxidants.';
        break;
      case 'olive':
      case 'dark-brown':
      case 'deep-black':
        warningTip = 'Deeper skins are highly prone to Post-Inflammatory Hyperpigmentation (PIH). Avoid harsh physical scrubs which trigger darkening. Incorporate gentle dark spot inhibitors.';
        pmSteps.splice(1, 0, 'Azelaic Acid or Licorice Root Extract (prevents uneven skin tone & corrects dark marks)');
        break;
    }

    // Cycle-Phase Hormonal Boosters
    let cycleBoost = '';
    switch (phase) {
      case 'menstrual':
        cycleBoost = 'Hormone Estrogen is low. Focus strictly on Moisture Barrier Support: Add a ultra-comfort sleep mask PM, avoid intense active chemical exfoliation right now.';
        pmSteps.push('Barrier Repair Sleeping Balm (Moisture Cycle Boost)');
        break;
      case 'follicular':
        cycleBoost = 'Skin thickness & collagen absorption is at its peak. Ideal phase to introduce active ingredients like safe Retinol or chemical peels.';
        amSteps.push('Gentle Glycolic Peel pad (Follicular Renewal Boost)');
        break;
      case 'ovulatory':
        cycleBoost = 'Testosterone peaking can create a transient sebum spike. Double cleansing PM is a must to keep pores clear.';
        pmSteps[0] = 'Deep Pore Double Cleanse (Ovulatory Radiance Maintenance)';
        break;
      case 'luteal':
        cycleBoost = 'Progesterone spikes. Breakout preventative! Use clay spot remedies and direct Tea tree/Salicylic Acid treatments to acne-prone zones.';
        pmSteps.push('Direct Salicylic Spot Dot or Tea tree gel (Hormonal breakout prevention)');
        break;
    }

    return { amSteps, pmSteps, specialIngredient, warningTip, cycleBoost };
  };

  const isProfileConfigured = userData.skinType && userData.skinTone;
  const activeRoutine = getCustomRoutine();
  
  // Stats & Progress indicators
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const loggedToday = skinDiary.find(e => e.date === todayStr);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed", err);
      setCameraError("Could not access camera device. Please allow permissions or select a photo file alternative.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const takeSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth, video.videoHeight) || 300;
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Square center crop for elegant social cards
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
        // Resized base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
      }
      stopCamera();
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          compressAndResizeImage(event.target.result, (compressed) => {
            setCapturedPhoto(compressed);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const compressAndResizeImage = (base64Str: string, callback: (resized: string) => void) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 300;
      const MAX_HEIGHT = 300;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(dataUrl);
      }
    };
  };

  const handleAddLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const filtered = skinDiary.filter(entry => entry.date !== todayStr);
    
    // Automatically flag completed if user checkmarked them all
    const routinesArr: ('am' | 'pm')[] = [];
    if (completedAmSteps.length > 0) routinesArr.push('am');
    if (completedPmSteps.length > 0) routinesArr.push('pm');

    const entry: SkinDiaryEntry = {
      date: todayStr,
      glowRating: newLog.glowRating || 4,
      routinesCompleted: routinesArr,
      completedAmSteps,
      completedPmSteps,
      breakoutLevel: newLog.breakoutLevel || 'none',
      notes: newLog.notes || '',
      photo: capturedPhoto || undefined
    };

    // Optimistic state update
    setSkinDiary([entry, ...filtered]);
    setIsAddingLog(false);

    // Save on Rust-powered backend via API
    fetch('/api/skincare', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    })
      .then(res => res.json())
      .then(data => {
        if (data.entry) {
          setSkinDiary(prev => [data.entry, ...prev.filter(x => x.date !== todayStr)]);
        }
      })
      .catch(err => {
        console.error("Failed to commit skincare entry to backend:", err);
      });

    // Reset active inputs
    setNewLog({ glowRating: 4, routinesCompleted: [], breakoutLevel: 'none', notes: '' });
    setCompletedAmSteps([]);
    setCompletedPmSteps([]);
    setCapturedPhoto(null);
  };

  // Streaks and Adherence statistics
  const calculateStats = () => {
    if (skinDiary.length === 0) return { streak: 0, amPct: 0, pmPct: 0, totalFiles: 0 };
    
    // Calculate overall streak
    let streakCount = 0;
    const sortedEntries = [...skinDiary].sort((a, b) => b.date.localeCompare(a.date));
    let checkDate = new Date();
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDateStr = sortedEntries[i].date;
      const entryDate = new Date(entryDateStr);
      
      const diffTime = Math.abs(checkDate.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If direct match (0 or 1 days gap)
      if (diffDays <= 2) {
        streakCount++;
        checkDate = entryDate;
      } else {
        break;
      }
    }

    const totalLogs = skinDiary.length;
    const amCount = skinDiary.filter(e => e.routinesCompleted.includes('am')).length;
    const pmCount = skinDiary.filter(e => e.routinesCompleted.includes('pm')).length;
    const totalFiles = skinDiary.filter(e => e.photo).length;

    return {
      streak: streakCount,
      amPct: Math.round((amCount / totalLogs) * 100),
      pmPct: Math.round((pmCount / totalLogs) * 100),
      totalFiles
    };
  };

  const adStats = calculateStats();

  const handleToggleAmStep = (step: string) => {
    if (completedAmSteps.includes(step)) {
      setCompletedAmSteps(completedAmSteps.filter(x => x !== step));
    } else {
      setCompletedAmSteps([...completedAmSteps, step]);
    }
  };

  const handleTogglePmStep = (step: string) => {
    if (completedPmSteps.includes(step)) {
      setCompletedPmSteps(completedPmSteps.filter(x => x !== step));
    } else {
      setCompletedPmSteps([...completedPmSteps, step]);
    }
  };

  const deleteDiaryEntry = (date: string) => {
    if (window.confirm("Are you sure you want to remove this skin progress check-in?")) {
      setSkinDiary(prev => prev.filter(e => e.date !== date));
      fetch(`/api/skincare/${date}`, {
        method: "DELETE"
      }).catch(err => {
        console.error("Failed to delete entry from backend:", err);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-3 bg-white p-5 rounded-3xl border border-brand-100 shadow-xs">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 rounded-2xl text-brand-700">
              <Sparkles className="w-5 h-5 text-brand-600 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-brand-900">Glow & Skincare</h2>
              <p className="text-[9px] text-brand-500 uppercase tracking-widest font-black">Hormone Sync Cosmetics</p>
            </div>
          </div>
        </div>

        {/* Dynamic Horizontal Sub Tabs */}
        <div className="flex bg-brand-50 p-1.5 rounded-2xl gap-0.5 overflow-x-auto shrink-0 max-w-full">
          <button
            onClick={() => { setSkinTab('routine'); stopCamera(); }}
            className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all whitespace-nowrap px-3 text-center ${
              skinTab === 'routine' ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-400 hover:text-brand-600'
            }`}
          >
            Routine
          </button>
          <button
            onClick={() => { setSkinTab('tracker'); stopCamera(); }}
            className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all whitespace-nowrap px-3 text-center ${
              skinTab === 'tracker' ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-400 hover:text-brand-600'
            }`}
          >
              Check-in
          </button>
          <button
            onClick={() => { setSkinTab('progress'); stopCamera(); }}
            className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all whitespace-nowrap px-3 text-center ${
              skinTab === 'progress' ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-400 hover:text-brand-600'
            }`}
          >
            Adherence
          </button>
          <button
            onClick={() => { setSkinTab('profile'); stopCamera(); }}
            className={`flex-1 py-2 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all whitespace-nowrap px-3 text-center ${
              skinTab === 'profile' ? 'bg-white text-brand-700 shadow-sm' : 'text-brand-400 hover:text-brand-600'
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Routine Tab */}
      {skinTab === 'routine' && (
        <div className="space-y-6">
          {!isProfileConfigured ? (
            <div className="bg-white rounded-3xl p-6 border border-brand-100 shadow-sm text-center space-y-4">
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-500">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-brand-900">Setup Your Skin Profile</h4>
                <p className="text-xs text-brand-500 max-w-xs mx-auto leading-relaxed">
                  Provide your skin behavior & Fitzpatrick skin tone range to generate real clinical menstrual-synced routines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSkinTab('profile')}
                className="py-2.5 px-6 bg-brand-600 text-white font-bold rounded-2xl text-xs hover:bg-brand-700 transition"
              >
                Configure Profile
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Summary Header */}
              <div className="bg-brand-50/50 rounded-3xl p-4 border border-brand-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-extrabold text-brand-400">Current Biomarkers</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-xs" 
                      style={{ backgroundColor: SKIN_TONES.find(t => t.id === userData.skinTone)?.color }}
                    />
                    <h4 className="font-bold text-brand-900 text-sm">
                      {SKIN_TYPES.find(t => t.id === userData.skinType)?.label} Skin
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => setSkinTab('profile')}
                  className="text-[10px] bg-brand-100 text-brand-800 font-bold px-2 py-1 rounded-lg"
                >
                  Adjust Tone
                </button>
              </div>

              {/* Hormonal Sync Overview */}
              {cycleInfo && (
                <div className="bg-gradient-to-br from-brand-600 to-brand-750 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                  <div className="relative z-10 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] uppercase tracking-widest font-black text-brand-100 bg-white/20 px-2 py-0.5 rounded-full">
                        Hormonal Cycle Sync
                      </span>
                      <span className="text-xs font-bold text-brand-100">
                        Day {cycleInfo.cycleDay} of {userData.cycleLength}d
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-white leading-tight">
                        {cycleInfo.phaseName} Glow Focus
                      </h3>
                      <p className="text-[11px] text-brand-100/90 leading-relaxed mt-1">
                        {cycleInfo.description}
                      </p>
                    </div>
                    
                    <div className="bg-brand-850/40 p-3.5 rounded-2xl border border-brand-500/30 text-[10px] leading-relaxed flex gap-2 items-start mt-2">
                      <Sparkles className="w-4 h-4 text-brand-200 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-brand-100 font-bold">Hormonal Skin Boost:</strong> {activeRoutine.cycleBoost}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AM Routine */}
              <div className="bg-white rounded-[2rem] p-6 border border-brand-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-50">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-brand-900">AM Morning Routine</h4>
                    <span className="text-[10px] text-brand-500">Focus: Protection & Sebum Balance</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {activeRoutine.amSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs items-start">
                      <div className="w-5 h-5 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-brand-800 leading-normal">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PM Routine */}
              <div className="bg-white rounded-[2rem] p-6 border border-brand-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-50">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Moon className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-brand-900">PM Evening Routine</h4>
                    <span className="text-[10px] text-brand-500">Focus: Deep Renewal & Recovery</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {activeRoutine.pmSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs items-start">
                      <div className="w-5 h-5 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-brand-800 leading-normal">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Check-in / Logger Tab */}
      {skinTab === 'tracker' && (
        <div className="space-y-6">
          {loggedToday ? (
            <div className="bg-brand-50 p-6 rounded-3xl border border-brand-250 text-center space-y-3">
              <div className="w-12 h-12 bg-white/80 text-brand-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-brand-900">Skin Log Completed Today!</h4>
                <p className="text-[11px] text-brand-600 mt-0.5">
                  Great job keeping your skincare calendar aligned.
                </p>
              </div>

              {loggedToday.photo && (
                <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-white shadow-md my-2 relative">
                  <img src={loggedToday.photo} alt="Logged skin state" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-brand-900/70 text-white text-[8px] px-1 py-0.5 rounded">Today</span>
                </div>
              )}

              <div className="bg-white p-3 rounded-2xl border border-brand-100/80 text-left space-y-1 my-1 max-w-xs mx-auto">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-brand-500 font-extrabold">Overall Glow</span>
                  <span className="font-extrabold text-brand-800">{loggedToday.glowRating}/5 ★</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-brand-500 font-extrabold">Active Breakout</span>
                  <span className="font-extrabold text-brand-800 uppercase tracking-wide">{loggedToday.breakoutLevel}</span>
                </div>
                {loggedToday.notes && (
                  <p className="text-[9.5px] italic text-brand-600 pt-1 border-t border-brand-50">
                    "{loggedToday.notes}"
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setNewLog(loggedToday);
                  setCompletedAmSteps(loggedToday.completedAmSteps || []);
                  setCompletedPmSteps(loggedToday.completedPmSteps || []);
                  setCapturedPhoto(loggedToday.photo || null);
                  setIsAddingLog(true);
                }}
                className="text-[11px] text-brand-600 hover:text-brand-800 font-bold underline"
              >
                Edit Today's Entry
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] p-6 border border-brand-100 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-brand-900 text-sm">Log Today's Skin Status</h4>
                  <p className="text-[10px] text-brand-500">Record micro-routine compliance & upload a visual progress selfie</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddingLog(true)}
                className="w-full py-3 bg-brand-600 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xs hover:bg-brand-700 transition"
              >
                <Plus className="w-4 h-4" /> Start Daily Skincare Log
              </button>
            </div>
          )}

          {/* Form to log skin status */}
          <AnimatePresence>
            {isAddingLog && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.2rem] p-6 border border-brand-200 shadow-xl space-y-6"
              >
                <div className="flex justify-between items-center border-b border-brand-50 pb-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <h4 className="font-serif font-bold text-brand-900 leading-none text-sm">Add Skin & Routine Log</h4>
                  </div>
                  <button 
                    onClick={() => { setIsAddingLog(false); stopCamera(); }}
                    className="text-xs text-brand-400 hover:text-brand-600 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleAddLogSubmit} className="space-y-6">
                  {/* Photo Capture Section */}
                  <div className="space-y-2 pb-4 border-b border-brand-50">
                    <label className="text-xs font-bold text-brand-850 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-brand-500" />
                      <span>Visual Skin Progress Photo (Required for Visual Logs):</span>
                    </label>

                    {isCameraActive ? (
                      <div className="space-y-3">
                        <div className="w-full max-w-[280px] aspect-square mx-auto rounded-2xl overflow-hidden relative border-2 border-brand-200 bg-black">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-4 border border-white/40 pointer-events-none rounded-xl" />
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={takeSnapshot}
                            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1"
                          >
                            Capture Snapshot
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {capturedPhoto ? (
                          <div className="flex items-center gap-4 bg-brand-50/40 p-3 rounded-2xl border border-brand-100 col-span-2">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-brand-200 shrink-0 relative">
                              <img src={capturedPhoto} alt="Captured preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] bg-brand-100 text-brand-800 font-extrabold px-1.5 py-0.5 rounded-sm">Photo Locked</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={startCamera}
                                  className="text-[10px] text-brand-600 font-bold underline"
                                >
                                  Retake
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCapturedPhoto(null)}
                                  className="text-[10px] text-red-600 font-bold underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Open Native Camera Option */}
                              <button
                                type="button"
                                onClick={startCamera}
                                className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-brand-100 transition"
                              >
                                <Camera className="w-5 h-5 text-brand-600" />
                                <span className="text-[10px] font-extrabold text-brand-700">Open Live Camera</span>
                              </button>

                              {/* Upload Image Option */}
                              <label
                                className="p-4 bg-brand-50 border border-brand-105 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-brand-100 transition cursor-pointer"
                              >
                                <ImageIcon className="w-5 h-5 text-brand-600" />
                                <span className="text-[10px] font-extrabold text-brand-700">Upload Photo File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="user"
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            {cameraError && (
                              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{cameraError}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Micro Routine Adherence tracking */}
                  {isProfileConfigured && (
                    <div className="space-y-4 pb-4 border-b border-brand-50">
                      <label className="text-xs font-bold text-brand-850 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                        <span>Daily Routine Steps Compliance checklist:</span>
                      </label>

                      {/* Morning checklist */}
                      <div className="space-y-2">
                        <span className="text-[9px] uppercase tracking-widest font-black text-amber-600 flex items-center gap-1">
                          <Sun className="w-3 h-3" /> AM morning checklist
                        </span>
                        <div className="space-y-1.5">
                          {activeRoutine.amSteps.map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => handleToggleAmStep(step)}
                              className={`w-full p-2.5 rounded-xl border text-left text-[11px] flex items-center justify-between transition ${
                                completedAmSteps.includes(step)
                                  ? 'bg-amber-50/50 border-amber-205 text-amber-900'
                                  : 'bg-brand-50/10 border-brand-100 text-brand-600 hover:bg-brand-50/40'
                              }`}
                            >
                              <span className="leading-tight flex-1 pr-3">{step}</span>
                              <div className={`w-4.5 h-4.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                completedAmSteps.includes(step) ? 'bg-amber-500 border-amber-650' : 'border-brand-200 bg-white'
                              }`}>
                                {completedAmSteps.includes(step) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Evening checklist */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[9px] uppercase tracking-widest font-black text-indigo-600 flex items-center gap-1">
                          <Moon className="w-3 h-3" /> PM Evening checklist
                        </span>
                        <div className="space-y-1.5">
                          {activeRoutine.pmSteps.map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => handleTogglePmStep(step)}
                              className={`w-full p-2.5 rounded-xl border text-left text-[11px] flex items-center justify-between transition ${
                                completedPmSteps.includes(step)
                                  ? 'bg-indigo-50/55 border-indigo-200 text-indigo-900'
                                  : 'bg-brand-50/10 border-brand-100 text-brand-600 hover:bg-brand-50/40'
                              }`}
                            >
                              <span className="leading-tight flex-1 pr-3">{step}</span>
                              <div className={`w-4.5 h-4.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                completedPmSteps.includes(step) ? 'bg-indigo-500 border-indigo-650' : 'border-brand-200 bg-white'
                              }`}>
                                {completedPmSteps.includes(step) && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Glow Rating */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-850 block">Overall Radiance / Glow Level:</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setNewLog({ ...newLog, glowRating: val })}
                          className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${
                            newLog.glowRating === val 
                              ? 'bg-brand-600 text-white border-brand-600 scale-105 shadow-xs' 
                              : 'bg-brand-50 text-brand-600 border-brand-100 hover:bg-brand-100'
                          }`}
                        >
                          {val} ★
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breakout Intensity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-850 block">Active Congestion / Breakout level:</label>
                    <div className="grid grid-cols-4 gap-1">
                      {(['none', 'minor', 'moderate', 'cystic'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setNewLog({ ...newLog, breakoutLevel: level })}
                          className={`py-2 rounded-lg border text-[10px] font-bold capitalize transition-all ${
                            newLog.breakoutLevel === level
                              ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                              : 'bg-brand-50 text-brand-600 border-brand-100 hover:bg-brand-100'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-850 block">Observations / Dynamic symptoms:</label>
                    <input
                      type="text"
                      value={newLog.notes || ''}
                      onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                      placeholder="e.g. slight hormonal chin spot, dry t-zone, feeling radiant"
                      className="w-full p-2.5 text-xs rounded-xl border border-brand-200 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-brand-600 text-white font-bold rounded-2xl text-xs hover:bg-brand-700 transition"
                  >
                    Save Check-in & Sync Photos
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Logs History */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-brand-900 uppercase tracking-widest px-1">Recent Cycle-Skin Activity</h4>
            {skinDiary.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-brand-100 text-center text-xs text-brand-400">
                No active records. Log your symptoms to visualize heatmaps!
              </div>
            ) : (
              skinDiary.slice(0, 3).map((entry) => (
                <div key={entry.date} className="bg-white rounded-2xl p-4 border border-brand-100 shadow-2xs space-y-2 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-brand-800">
                        {format(new Date(entry.date), 'MMMM d, yyyy')}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">Glow rating: {entry.glowRating}/5 ★</span>
                        <span className="text-[9px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded capitalize">Breakouts: {entry.breakoutLevel}</span>
                      </div>
                    </div>
                    {entry.photo && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-brand-200 shrink-0">
                        <img src={entry.photo} className="w-full h-full object-cover" alt="logged skin detail" />
                      </div>
                    )}
                  </div>
                  
                  {entry.notes && (
                    <p className="text-[10px] italic text-brand-500 bg-brand-50/20 p-2 rounded-xl mt-1 leading-normal">
                      "{entry.notes}"
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-brand-50 text-[10px]">
                    <div className="flex gap-1">
                      {entry.routinesCompleted.includes('am') && (
                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 text-[8px] border border-amber-100">
                          <Sun className="w-2 h-2" /> AM
                        </span>
                      )}
                      {entry.routinesCompleted.includes('pm') && (
                        <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 text-[8px] border border-indigo-100">
                          <Moon className="w-2 h-2" /> PM
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => deleteDiaryEntry(entry.date)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Progressive Adherence Tab */}
      {skinTab === 'progress' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-brand-100 text-center shadow-2xs">
              <span className="text-[9px] font-black uppercase text-brand-400 block tracking-wider">Logging Streak</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-amber-500 leading-none">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xl font-serif font-black">{adStats.streak}d</span>
              </div>
              <p className="text-[8px] text-brand-400 mt-0.5">Consecutive log-ins</p>
            </div>
            
            <div className="bg-white p-4 rounded-3xl border border-brand-100 text-center shadow-2xs">
              <span className="text-[9px] font-black uppercase text-brand-400 block tracking-wider">AM Compliance</span>
              <span className="text-xl font-serif font-black text-brand-800 mt-1 inline-block">{adStats.amPct}%</span>
              <p className="text-[8px] text-brand-400 mt-0.5">Morning checks</p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-brand-100 text-center shadow-2xs">
              <span className="text-[9px] font-black uppercase text-brand-400 block tracking-wider">PM Compliance</span>
              <span className="text-xl font-serif font-black text-brand-800 mt-1 inline-block">{adStats.pmPct}%</span>
              <p className="text-[8px] text-brand-400 mt-0.5">Nightly checks</p>
            </div>
          </div>

          {/* Motivational Badges & Achievements */}
          <div className="bg-white rounded-3xl p-5 border border-brand-100 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Glow & Skincare Achievements:</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-2xl border text-left flex gap-2 items-start ${
                adStats.streak >= 3 ? 'bg-amber-50/40 border-amber-205 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
              }`}>
                <Zap className={`w-4 h-4 shrink-0 ${adStats.streak >= 3 ? 'text-amber-500' : 'text-gray-300'}`} />
                <div>
                  <strong className="font-extrabold text-[10px] block">Barrier Hero</strong>
                  <span className="text-[8.5px] leading-tight block">Log skincare for 3 consecutive days.</span>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border text-left flex gap-2 items-start ${
                adStats.totalFiles >= 1 ? 'bg-brand-50/40 border-brand-200 text-brand-900' : 'bg-gray-50 border-gray-100 text-gray-400 opacity-60'
              }`}>
                <Camera className={`w-4 h-4 shrink-0 ${adStats.totalFiles >= 1 ? 'text-brand-500' : 'text-gray-300'}`} />
                <div>
                  <strong className="font-extrabold text-[10px] block">Visual Journal</strong>
                  <span className="text-[8.5px] leading-tight block">Save your first visual progress mugshot.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Adherence Calendar Heatmap Tracker */}
          <div className="bg-white rounded-[2rem] p-6 border border-brand-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-brand-50">
              <div>
                <h4 className="font-serif font-bold text-brand-900">Routines Consistency Tracker</h4>
                <p className="text-[10px] text-brand-500">Visual compliance calendar logs</p>
              </div>
            </div>

            {skinDiary.length === 0 ? (
              <div className="p-8 text-center text-xs text-brand-400">
                Log skin status to map daily visual coordinates.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Custom calendar display (representing logged entries) */}
                <div className="grid grid-cols-5 gap-2">
                  {[...skinDiary].slice(0, 10).reverse().map((entry) => {
                    const hasAm = entry.routinesCompleted.includes('am');
                    const hasPm = entry.routinesCompleted.includes('pm');
                    return (
                      <div 
                        key={entry.date} 
                        className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 ${
                          hasAm && hasPm 
                            ? 'bg-amber-50/60 border-amber-200 text-amber-900' 
                            : hasAm 
                            ? 'bg-amber-50/30 border-amber-100 text-amber-800'
                            : hasPm
                            ? 'bg-indigo-50/30 border-indigo-100 text-indigo-800'
                            : 'bg-brand-50/40 border-brand-100 text-brand-700'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold text-brand-600">
                          {format(new Date(entry.date), 'M/d')}
                        </span>
                        
                        <div className="flex gap-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${hasAm ? 'bg-amber-500' : 'bg-gray-200'}`} title="AM" />
                          <span className={`w-1.5 h-1.5 rounded-full ${hasPm ? 'bg-indigo-500' : 'bg-gray-200'}`} title="PM" />
                        </div>

                        <span className="text-[9px] font-black">{entry.glowRating} ★</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[8.5px] text-brand-400 bg-brand-50/50 p-2 rounded-xl">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> <span>AM Done</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" /> <span>PM Done</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-200" /> <span>Step Missed</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual Progress Logs Timeline and Comparison */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-brand-900 flex items-center gap-1.5 px-1 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-brand-600" />
              <span>Skin Glow Progress Timeline</span>
            </h4>

            {skinDiary.filter(e => e.photo).length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-brand-100 text-center text-xs text-brand-400 shadow-2xs">
                No visual photos captured yet. Take snapshots to log daily visuals!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {skinDiary.filter(e => e.photo).map((entry) => (
                  <div key={entry.date} className="bg-white p-3 rounded-[2rem] border border-brand-100 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden border border-brand-100 bg-brand-50 relative">
                      <img src={entry.photo} className="w-full h-full object-cover" alt="visual status check" />
                      <div className="absolute top-2 left-2 bg-brand-900/60 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        {format(new Date(entry.date), 'MMM d')}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-brand-500 font-extrabold">Radiance:</span>
                        <span className="text-[10px] font-black text-brand-800">{entry.glowRating}/5 ★</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-brand-500">
                        <span>Breakouts:</span>
                        <span className="font-extrabold text-brand-800 capitalize leading-none">{entry.breakoutLevel}</span>
                      </div>
                      {entry.notes && (
                        <p className="text-[9px] text-brand-500 leading-normal italic line-clamp-2 mt-0.5 border-t border-brand-50 pt-1">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteDiaryEntry(entry.date)}
                      className="w-full mt-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Picture
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {skinTab === 'profile' && (
        <SkinProfileForm 
          userData={userData} 
          onSave={handleSaveProfile} 
        />
      )}
    </div>
  );
}

// Subcomponent: SkinProfileForm
function SkinProfileForm({ 
  userData, 
  onSave 
}: { 
  userData: UserData;
  onSave: (type: UserData['skinType'], tone: UserData['skinTone']) => void;
}) {
  const [selectedType, setSelectedType] = useState<UserData['skinType']>(userData.skinType || 'normal');
  const [selectedTone, setSelectedTone] = useState<UserData['skinTone']>(userData.skinTone || 'medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedType, selectedTone);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-6 border border-brand-100 shadow-sm space-y-6">
      <div className="space-y-1">
        <h3 className="font-serif font-bold text-brand-900 text-base">Select Your Skin Type</h3>
        <p className="text-[10px] text-brand-500">Pick the term that is closest to your sebum production.</p>
      </div>

      <div className="space-y-2.5">
        {SKIN_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setSelectedType(type.id)}
            className={`w-full p-3.5 rounded-2xl border text-left flex justify-between items-center transition ${
              selectedType === type.id 
                ? 'bg-brand-600/5 text-brand-900 border-brand-600 ring-1 ring-brand-600' 
                : 'bg-brand-50/20 text-brand-800 border-brand-100 hover:bg-brand-50/50'
            }`}
          >
            <div className="space-y-1 pr-4">
              <span className="font-bold text-xs block">{type.label}</span>
              <span className="text-[10px] text-brand-500 leading-relaxed block">{type.desc}</span>
            </div>
            {selectedType === type.id && (
              <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-1 pt-4 border-t border-brand-50">
        <h3 className="font-serif font-bold text-brand-900 text-base">Identify Fitzpatrick Skin Tone</h3>
        <p className="text-[10px] text-brand-500">
          Fitzpatrick phototyping influences skin sensitivity and pigment activation (PIH) parameters.
        </p>
      </div>

      <div className="space-y-2.5">
        {SKIN_TONES.map((tone) => (
          <button
            key={tone.id}
            type="button"
            onClick={() => setSelectedTone(tone.id)}
            className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition ${
              selectedTone === tone.id 
                ? 'bg-brand-600/5 text-brand-900 border-brand-600 ring-1 ring-brand-600' 
                : 'bg-brand-50/20 text-brand-800 border-brand-100 hover:bg-brand-50/50'
            }`}
          >
            <span 
              className="w-8 h-8 rounded-full border border-black/10 shadow-xs shrink-0 mt-0.5" 
              style={{ backgroundColor: tone.color }}
            />
            <div className="space-y-0.5 flex-1">
              <span className="font-bold text-xs block">{tone.label}</span>
              <span className="text-[10px] text-brand-500 leading-relaxed block">{tone.desc}</span>
            </div>
            {selectedTone === tone.id && (
              <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-brand-600 text-white font-bold rounded-2xl text-xs hover:bg-brand-700 transition"
      >
        Apply Selection & View Routines
      </button>
    </form>
  );
}
