/** Journal volumes advance annually from the inaugural volume. */
export function volumeYear(volume: string | number): number {
  const value = Number(volume);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Volume must be a positive whole number.");
  }
  return 2025 + value;
}