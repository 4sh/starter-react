/*
 * ui-sidebar livre aussi son menu déclaratif et le crochet de ses
 * déclencheurs : les trois lisent le même état, un seul point d'entrée.
 */

export {
  UiSidebar,
  UiSidebarProvider,
  useUiSidebar,
  useUiSidebarTrigger,
  getUiSidebarTriggerProps,
  type UiSidebarProps,
  type UiSidebarApi,
  type UiSidebarSlot,
  type UiSidebarTriggerProps,
  type SidebarSide,
  type SidebarMode,
} from './ui-sidebar';
export {
  UiSidebarMenu,
  type UiSidebarMenuProps,
  type UiSidebarMenuItem,
  type UiSidebarMenuItemCommandEvent,
  type UiSidebarMenuItemRootProps,
  type SidebarMenuSize,
} from './ui-sidebar-menu';
