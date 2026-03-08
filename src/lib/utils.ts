import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format date as DD/MM/YYYY */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format date as DD/MM/YYYY, HH:MM */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Format date as "1 January 2026" (DD Month YYYY) */
export function formatDateLong(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Format date as "January 2026" (Month YYYY) */
export function formatMonthYear(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
