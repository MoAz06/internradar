// A short message at the bottom of the screen, for example after a Save. Any component can call toast();
// components/Toast.tsx (in the layout) shows it. An undo function adds an Undo button.

export const TOAST_EVENT = "internradar:toast";
export type ToastDetail = { text: string; undo?: () => void };

export function toast(text: string, undo?: () => void) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { text, undo } }));
}
