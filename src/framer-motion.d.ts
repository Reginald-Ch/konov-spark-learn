import 'framer-motion';

// Fix MotionStyle type compatibility with framer-motion v12 + React 18
declare module 'framer-motion' {
  interface MotionStyle extends React.CSSProperties {}
}
