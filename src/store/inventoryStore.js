export const initialInventoryState = {
  inventory: [],
  maintLog: [],
};

export const inventoryReducer = (state, action) => {
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
      let bhp = state.bhp;
      action.log.bhp.forEach((b) => {
        bhp = bhp.map((x) =>
          x.id !== b.id ? x : { ...x, stock: Math.max(0, x.stock - b.qty) }
        );
      });
      const inv = state.inventory.map((x) =>
        x.code !== action.log.asset ? x : { ...x, cond: action.log.cond, last: 'baru saja' }
      );
      return { maintLog: [action.log, ...state.maintLog], bhp, inventory: inv };
    }
    default:
      return null;
  }
};
