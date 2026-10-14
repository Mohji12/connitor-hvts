'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsAppShell } from '@/hooks/use-mobile';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * For large existing dialogs that cannot easily move to ResponsiveDialog: add to DialogContent's
 * className to dock it to the bottom of the screen like a sheet below `lg`.
 */
export const MOBILE_SHEET_DIALOG_CLASS =
  'max-lg:top-auto max-lg:bottom-0 max-lg:left-0 max-lg:max-w-full max-lg:translate-x-0 max-lg:translate-y-0 max-lg:rounded-b-none max-lg:rounded-t-2xl max-lg:max-h-[90dvh] max-lg:pb-[calc(1.5rem+env(safe-area-inset-bottom))]';

/** Bottom sheet on phones and in the app; centered dialog on desktop. */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ResponsiveDialogProps): React.ReactElement {
  const isAppShell = useIsAppShell();

  if (isAppShell) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="pb-safe max-h-[90dvh] gap-0 rounded-t-2xl p-0">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted" aria-hidden />
          <SheetHeader className="px-4 pb-2 pt-3 text-left">
            <SheetTitle className="m-title pr-8">{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{title}</SheetDescription>
            )}
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-3">{children}</div>
          {footer ? (
            <div className="flex gap-2 border-t border-slate-200 px-4 py-3 [&>*]:flex-1">{footer}</div>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
