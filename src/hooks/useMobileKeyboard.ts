import { useEffect, useState } from 'react';
import { isMobileCameraDevice } from '../shared/cameraDevices';

export function keyboardIsVisible(typing: boolean, baseline: number, height: number, scale = 1) {
  return typing && scale === 1 && baseline - height > 150;
}
export function useMobileKeyboard() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!isMobileCameraDevice(window.navigator)) return;
    const viewport = window.visualViewport;
    let baseline = window.innerHeight;
    let frame = 0;
    const update = () => {
      const focused = document.activeElement;
      const typing = !!focused && focused.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]), [contenteditable="true"]');
      const height = viewport?.height ?? window.innerHeight;
      const scale = viewport?.scale ?? 1;
      if (!typing) baseline = Math.max(window.innerHeight, height);
      setVisible(keyboardIsVisible(typing, baseline, height, scale));
      if (scale === 1) document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const rotate = () => { baseline = window.innerHeight; schedule(); };
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', rotate);
    viewport?.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', rotate);
      viewport?.removeEventListener('resize', schedule);
      document.documentElement.style.removeProperty('--app-viewport-height');
    };
  }, []);
  return visible;
}
