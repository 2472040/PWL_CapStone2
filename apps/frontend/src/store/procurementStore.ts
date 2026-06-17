import { Draft, BhpItem, AppStoreState, AppAction } from './store.types';

export interface ProcurementState {
  drafts: Draft[];
  bhp: BhpItem[];
}

export const initialProcurementState: ProcurementState = {
  drafts: [],
  bhp: [],
};

export const procurementReducer = (
  state: AppStoreState,
  action: AppAction
): Partial<AppStoreState> | null => {
  switch (action.type) {
    case 'SET_DRAFTS':
      return { drafts: action.drafts };
    case 'SET_APPROVAL':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it) =>
                  it.id !== action.itemId
                    ? it
                    : { ...it, approval: it.approval === action.value ? null : action.value }
                ),
              }
        ),
      };
    case 'APPROVE_ALL':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it) => ({ ...it, approval: it.approval || 'ok' })),
              }
        ),
      };
    case 'FINALIZE_DRAFT':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code ? d : { ...d, status: 'finalized' as const }
        ),
      };
    case 'MARK_RECEIVED':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it) => {
                  if (it.id !== action.itemId) return it;
                  const newReceived = !it.received;
                  const currentReceivings = it.receivings || [];
                  return {
                    ...it,
                    received: newReceived,
                    receivedDate: newReceived ? action.date : null,
                    receivings: newReceived
                      ? [
                          ...currentReceivings,
                          {
                            received_date: action.date || new Date().toISOString().substring(0, 10),
                          },
                        ]
                      : currentReceivings.slice(0, -1),
                  };
                }),
              }
        ),
      };
    case 'COMPLETE_DRAFT':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code ? d : { ...d, status: 'completed' as const }
        ),
      };
    case 'REQUEST_REVISION':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code
            ? d
            : { ...d, status: 'revision' as const, revision_notes: action.notes }
        ),
      };
    case 'ADD_DRAFT_ITEM':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code ? d : { ...d, items: [...d.items, action.item!] }
        ),
      };
    case 'UPDATE_DRAFT_ITEM':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code
            ? d
            : {
                ...d,
                items: d.items.map((it) =>
                  it.id !== action.itemId ? it : { ...it, ...action.item }
                ),
              }
        ),
      };
    case 'REMOVE_DRAFT_ITEM':
      return {
        drafts: state.drafts.map((d) =>
          d.code !== action.code
            ? d
            : { ...d, items: d.items.filter((it) => it.id !== action.itemId) }
        ),
      };
    case 'NEW_DRAFT':
      return { drafts: [action.draft!, ...state.drafts] };
    case 'SET_BHP':
      return { bhp: action.bhp };
    case 'BHP_DELTA':
      return {
        bhp: state.bhp.map((b) =>
          b.id !== action.id ? b : { ...b, stock: Math.max(0, b.stock + (action.delta ?? 0)) }
        ),
      };
    case 'BHP_RESTOCK':
      return {
        bhp: state.bhp.map((b) =>
          b.id !== action.id
            ? b
            : { ...b, stock: b.stock + (action.amount ?? 0), lastIn: action.date ?? '' }
        ),
      };
    default:
      return null;
  }
};
