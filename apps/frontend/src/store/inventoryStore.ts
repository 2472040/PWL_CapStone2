import { InventoryItem, MaintenanceLog, AppStoreState, AppAction } from './store.types';

export interface InventoryState {
  inventory: InventoryItem[];
  maintLog: MaintenanceLog[];
}

export const initialInventoryState: InventoryState = {
  inventory: [],
  maintLog: [],
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
    default:
      return null;
  }
};
