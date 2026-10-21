import { useEffect } from 'react';

/**
 * Custom hook to dynamically update page title in the browser tab.
 * @param {string} title 
 * @param {boolean} [retainOnUnmount=false]
 */
export function useDocumentTitle(title, retainOnUnmount = false) {
  useEffect(() => {
    const defaultTitle = 'LAKSH — Gym Workout & Fitness Tracker';
    if (title) {
      document.title = `${title} | LAKSH`;
    } else {
      document.title = defaultTitle;
    }

    return () => {
      if (!retainOnUnmount) {
        document.title = defaultTitle;
      }
    };
  }, [title, retainOnUnmount]);
}
