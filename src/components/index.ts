// src/components/index.ts
export { default as UpdateBanner } from './UpdateBanner';
export { default as UpdateModal } from './UpdateModal';
export { default as ScreenContainer } from './ScreenContainer';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Button } from './Button';
export { default as Modal } from './Modal';
// ✅ Modal global agora está no ModalContext
export { ModalProvider, useModal } from './ModalContext';