import { TOTAL_HIZB, TOTAL_PAGES } from './constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validation = {
  email: (email: string): ValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      return { valid: false, error: 'L\'email est requis' };
    }
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Email invalide' };
    }
    return { valid: true };
  },

  hizbValue: (value: number): ValidationResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: 'La valeur doit être un nombre' };
    }
    if (value < 1 || value > TOTAL_HIZB) {
      return { valid: false, error: `La valeur doit être entre 1 et ${TOTAL_HIZB}` };
    }
    if (!Number.isInteger(value)) {
      return { valid: false, error: 'La valeur doit être un nombre entier' };
    }
    return { valid: true };
  },

  pageValue: (value: number): ValidationResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: 'La valeur doit être un nombre' };
    }
    if (value < 1 || value > TOTAL_PAGES) {
      return { valid: false, error: `La valeur doit être entre 1 et ${TOTAL_PAGES}` };
    }
    if (!Number.isInteger(value)) {
      return { valid: false, error: 'La valeur doit être un nombre entier' };
    }
    return { valid: true };
  },

  cycleNumber: (value: number): ValidationResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: 'Le cycle doit être un nombre' };
    }
    if (value < 0) {
      return { valid: false, error: 'Le cycle ne peut pas être négatif' };
    }
    if (!Number.isInteger(value)) {
      return { valid: false, error: 'Le cycle doit être un nombre entier' };
    }
    if (value > 1000) {
      return { valid: false, error: 'Le cycle semble trop élevé (max: 1000)' };
    }
    return { valid: true };
  },

  groupName: (name: string): ValidationResult => {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Le nom du groupe est requis' };
    }
    if (name.length < 2) {
      return { valid: false, error: 'Le nom doit faire au moins 2 caractères' };
    }
    if (name.length > 100) {
      return { valid: false, error: 'Le nom ne peut pas dépasser 100 caractères' };
    }
    return { valid: true };
  },

  participantName: (name: string): ValidationResult => {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Le nom est requis' };
    }
    if (name.length < 2) {
      return { valid: false, error: 'Le nom doit faire au moins 2 caractères' };
    }
    if (name.length > 50) {
      return { valid: false, error: 'Le nom ne peut pas dépasser 50 caractères' };
    }
    return { valid: true };
  },

  weeklyTarget: (value: number): ValidationResult => {
    if (value !== 7 && value !== 14) {
      return { valid: false, error: 'L\'objectif hebdomadaire doit être 7 ou 14 hizb' };
    }
    return { valid: true };
  }
};
