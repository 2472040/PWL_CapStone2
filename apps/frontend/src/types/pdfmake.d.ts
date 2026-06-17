declare module 'pdfmake/build/pdfmake' {
  const content: any;
  export default content;
}
declare module 'pdfmake/build/vfs_fonts' {
  const content: any;
  export default content;
}
declare module '*.css';

interface LokaSoundsType {
  click: () => void;
  hover: () => void;
  success: () => void;
  error: () => void;
  toggle: () => void;
  drawer: () => void;
}

interface Window {
  gsap?: any;
  ScrollTrigger?: any;
  Lenis?: any;
  LokaSounds?: LokaSoundsType;
  webkitAudioContext: typeof AudioContext;
}
