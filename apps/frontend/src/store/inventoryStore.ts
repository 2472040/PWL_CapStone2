import {
  InventoryItem,
  MaintenanceLog,
  MaintenanceSchedule,
  AppStoreState,
  AppAction,
} from './store.types';

export interface InventoryState {
  inventory: InventoryItem[];
  maintLog: MaintenanceLog[];
  maintSchedules: MaintenanceSchedule[];
}

export const initialInventoryState: InventoryState = {
  inventory: [],
  maintLog: [],
  maintSchedules: [],
};

export const inventoryReducer = (
  state: AppStoreState,
  action: AppAction
): Partial<AppStoreState> | null => {
  switch (action.type) {
    case 'SET_INVENTORY':
      return { inventory: action.inventory };
    case 'UPDATE_ASSET_LABEL':
      return {
        inventory: state.inventory.map((x) =>
          x.code !== action.code ? x : { ...x, ...action.patch }
        ),
      };
    case 'SET_MAINT_LOGS':
      return { maintLog: action.logs };
    case 'ADD_MAINT_LOG': {
      const log = action.log;
      if (!log) return null;
      let bhp = state.bhp;
      log.bhp.forEach((b) => {
        bhp = bhp.map((x) => (x.id !== b.id ? x : { ...x, stock: Math.max(0, x.stock - b.qty) }));
      });
      const inv = state.inventory.map((x) =>
        x.code !== log.asset ? x : { ...x, cond: log.cond, last: 'baru saja' }
      );
      return { maintLog: [log, ...state.maintLog], bhp, inventory: inv };
    }
    case 'SET_MAINT_SCHEDULES':
      return { maintSchedules: action.schedules || [] };
    case 'ADD_MAINT_SCHEDULE':
      return action.schedule
        ? { maintSchedules: [action.schedule, ...state.maintSchedules] }
        : null;
    case 'UPDATE_MAINT_SCHEDULE':
      return action.schedule
        ? {
            maintSchedules: state.maintSchedules.map((x) =>
              x.id !== action.schedule!.id ? x : action.schedule!
            ),
          }
        : null;
    case 'DELETE_MAINT_SCHEDULE':
      return action.scheduleId !== undefined
        ? {
            maintSchedules: state.maintSchedules.filter((x) => x.id !== action.scheduleId),
          }
        : null;
    default:
      return null;
  }
};
