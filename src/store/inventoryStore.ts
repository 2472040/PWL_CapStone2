import { InventoryItem, MaintenanceLog, AppAction } from './store.types';

export interface InventoryState {
  inventory: InventoryItem[];
  maintLog: MaintenanceLog[];
}

export const initialInventoryState: InventoryState = {
  inventory: [],
  maintLog: [],
};

export const inventoryReducer = (state: Record<string, any>, action: AppAction): Record<string, any> | null => {
  switch (action.type) {
    case 'SET_INVENTORY':
      return { inventory: action.inventory };
    case 'UPDATE_ASSET_LABEL':
      return {
        inventory: state.inventory.map((x: any) =>
          x.code !== action.code ? x : { ...x, ...action.patch }
        ),
      };
    case 'SET_MAINT_LOGS':
      return { maintLog: action.logs };
    case 'ADD_MAINT_LOG': {
      let bhp = state.bhp;
      action.log.bhp.forEach((b: any) => {
        bhp = bhp.map((x: any) =>
          x.id !== b.id ? x : { ...x, stock: Math.max(0, x.stock - b.qty) }
        );
      });
      const inv = state.inventory.map((x: any) =>
        x.code !== action.log.asset ? x : { ...x, cond: action.log.cond, last: 'baru saja' }
      );
      return { maintLog: [action.log, ...state.maintLog], bhp, inventory: inv };
    }
    default:
      return null;
  }
};
