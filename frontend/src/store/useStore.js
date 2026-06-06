import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null, 
  setUser: (user) => set({ user }),
  
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));
