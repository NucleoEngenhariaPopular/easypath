import { writable } from "svelte/store";

// const storedValue = typeof window !== 'undefined' ? localStorage.getItem('sideBarOpen') : 'true';

export const isMenuSideBarOpen = writable(true);

// Subscribe to changes and update localStorage
// if (typeof window !== 'undefined') {
//   isMenuSideBarOpen.subscribe(value => {
//     localStorage.setItem('sidebarOpen', value);
//   });
// }


