import { MealSuggestion, MedInfo } from './types';

export const MEAL_SUGGESTIONS: MealSuggestion[] = [
  {
    id: '1',
    title: 'Iron-Rich Spinach & Lentil Soup',
    description: 'A warm, comforting soup packed with iron to help replenish blood levels.',
    benefits: ['High iron', 'Easy to digest', 'Anti-inflammatory'],
    category: 'lunch',
  },
  {
    id: '2',
    title: 'Ginger & Turmeric Congee',
    description: 'Soft rice porridge with healing spices to soothe the digestive system and reduce inflammation.',
    benefits: ['Soothing', 'Anti-inflammatory', 'Hydrating'],
    category: 'breakfast',
  },
  {
    id: '3',
    title: 'Baked Salmon with Steamed Greens',
    description: 'Rich in Omega-3 fatty acids to help with mood regulation and physical healing.',
    benefits: ['Omega-3', 'Protein', 'Vitamin D'],
    category: 'dinner',
  },
  {
    id: '4',
    title: 'Warm Bone Broth',
    description: 'Nutrient-dense liquid gold that provides essential amino acids for tissue repair.',
    benefits: ['Collagen', 'Hydration', 'Easy absorption'],
    category: 'snack',
  }
];

export const RECOVERY_MEDS: MedInfo[] = [
  {
    id: 'm1',
    name: 'Ibuprofen (Advil/Motrin)',
    purpose: 'Pain relief and reducing inflammation.',
    advice: 'Take with food to protect your stomach. Follow the dosage on the package or as advised by your doctor.',
  },
  {
    id: 'm2',
    name: 'Acetaminophen (Tylenol)',
    purpose: 'Pain relief.',
    advice: 'Can be taken alongside Ibuprofen if pain is severe, but be careful not to exceed daily limits.',
  },
  {
    id: 'm3',
    name: 'Heating Pad',
    purpose: 'Soothing uterine cramps.',
    advice: 'Apply to lower abdomen for 15-20 minutes at a time. Not a med, but highly effective.',
  }
];

export const FAMILY_PLANNING_MEDS = [
  'Combined Pill',
  'Progestogen-only Pill',
  'IUD (Hormonal)',
  'IUD (Copper)',
  'Contraceptive Injection',
  'Contraceptive Patch',
  'Vaginal Ring',
  'Implant',
  'None'
];

export const FIBROID_SYMPTOMS = [
  'Heavy Bleeding',
  'Pelvic Pain',
  'Frequent Urination',
  'Constipation',
  'Backache',
  'Leg Pains',
  'Pressure in Abdomen',
  'Pain during Intercourse'
];

export const FIBROID_INFO = {
  title: 'Understanding Fibroids',
  description: 'Uterine fibroids are noncancerous growths of the uterus that often appear during childbearing years.',
  tips: [
    'Track your bleeding intensity to share with your doctor.',
    'Monitor pelvic pressure or pain levels daily.',
    'Note if symptoms worsen during specific times in your cycle.',
    'Stay hydrated and consider anti-inflammatory foods.'
  ]
};
