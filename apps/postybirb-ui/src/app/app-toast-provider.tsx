import { EuiGlobalToastList } from '@elastic/eui';
import { Toast } from '@elastic/eui/src/components/toast/global_toast_list';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Trans } from '@lingui/macro';
import { HttpResponse } from '../transports/http-client';

export type AppToastContext = {
  addErrorToast: (err: HttpResponse<never>) => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
};

const ToastContext = createContext<AppToastContext>({} as AppToastContext);

export type AppToastContextValue = {
  addErrorToast: (err: HttpResponse<never>) => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
};

export function useToast(): AppToastContextValue {
  const { addToast, removeToast, addErrorToast } = useContext(ToastContext);
  return { addToast, removeToast, addErrorToast };
}

export function AppToastProvider({ children }: PropsWithChildren<unknown>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Toast) => {
      if (!toasts.find((t) => t.id === toast.id)) {
        setToasts([...toasts, toast]);
      }
    },
    [toasts, setToasts]
  );

  const removeToast = useCallback(
    (id: string) => {
      if (toasts.find((t) => t.id === id)) {
        setToasts([...toasts].filter((t) => t.id !== id));
      }
    },
    [toasts, setToasts]
  );

  const addErrorToast = useCallback(
    (res: HttpResponse<never>) => {
      addToast({
        id: Date.now().toString(),
        color: 'danger',
        iconType: 'error',
        text: <span>{res.error.message}</span>,
        title: (
          <div>
            <Trans context="Error toast">Error</Trans>
            <span> </span>
            <span>
              {res.error.statusCode} - {res.error.error}
            </span>
          </div>
        ),
      });
    },
    [addToast]
  );

  const contextValue = useMemo(
    () => ({ toasts, addToast, addErrorToast, removeToast }),
    [toasts, removeToast, addToast, addErrorToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <>
        <EuiGlobalToastList
          toasts={toasts}
          dismissToast={(toast: Toast) => {
            removeToast(toast.id);
          }}
          toastLifeTimeMs={6000}
        />
        {children}
      </>
    </ToastContext.Provider>
  );
}
