import { Draft, BhpItem, AppAction } from './store.types';

export interface ProcurementState {
  drafts: Draft[];
  bhp: BhpItem[];
}

export const initialProcurementState: ProcurementState = {
  drafts: [],
  bhp: [],
};

export const procurementReducer = (
  state: Record<string, any>,
  action: AppAction
): Record<string, any> | null => {
  switch (action.type) {
    case 'SET_DRAFTS':
      return { drafts: action.drafts };
    case 'SET_APPROVAL':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it: any) =>
                  it.id !== action.itemId
                    ? it
                    : { ...it, approval: it.approval === action.value ? null : action.value }
                ),
              }
        ),
      };
    case 'APPROVE_ALL':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it: any) => ({ ...it, approval: it.approval || 'ok' })),
              }
        ),
      };
    case 'FINALIZE_DRAFT':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code ? d : { ...d, status: 'finalized' }
        ),
      };
    case 'MARK_RECEIVED':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it: any) =>
                  it.id !== action.itemId
                    ? it
                    : {
                        ...it,
                        received: !it.received,
                        receivedDate: !it.received ? action.date : null,
                      }
                ),
              }
        ),
      };
    case 'COMPLETE_DRAFT':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code ? d : { ...d, status: 'completed' }
        ),
      };
    case 'REQUEST_REVISION':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code ? d : { ...d, status: 'revision', revision_notes: action.notes }
        ),
      };
    case 'ADD_DRAFT_ITEM':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code ? d : { ...d, items: [...d.items, action.item] }
        ),
      };
    case 'UPDATE_DRAFT_ITEM':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it: any) =>
                  it.id !== action.itemId ? it : { ...it, ...action.item }
                ),
              }
        ),
      };
    case 'REMOVE_DRAFT_ITEM':
      return {
        drafts: state.drafts.map((d: any) =>
          d.code !== action.code
            ? d
            : { ...d, items: d.items.filter((it: any) => it.id !== action.itemId) }
        ),
      };
    case 'NEW_DRAFT':
      return { drafts: [action.draft, ...state.drafts] };
    case 'SET_BHP':
      return { bhp: action.bhp };
    case 'BHP_DELTA':
      return {
        bhp: state.bhp.map((b: any) =>
          b.id !== action.id ? b : { ...b, stock: Math.max(0, b.stock + action.delta) }
        ),
      };
    case 'BHP_RESTOCK':
      return {
        bhp: state.bhp.map((b: any) =>
          b.id !== action.id ? b : { ...b, stock: b.stock + action.amount, lastIn: action.date }
        ),
      };
    default:
      return null;
  }
};
