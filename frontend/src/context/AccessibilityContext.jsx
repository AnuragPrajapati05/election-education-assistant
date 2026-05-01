import { createContext, useContext, useState, useEffect } from "react";

const A11yContext = createContext(null);

export function AccessibilityProvider({ children }) {
  const [highContrast, setHighContrast] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [fontSize, setFontSize] = useState("md");

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    const sizes = { sm: "13px", md: "15px", lg: "17px" };
    document.documentElement.style.fontSize = sizes[fontSize] || "15px";
  }, [fontSize]);

  const speak = (text) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 1;
    window.speechSynthesis.speak(utt);
  };

  return (
    <A11yContext.Provider value={{ highContrast, setHighContrast, voiceEnabled, setVoiceEnabled, fontSize, setFontSize, speak }}>
      {children}
    </A11yContext.Provider>
  );
}

export const useAccessibility = () => useContext(A11yContext);
