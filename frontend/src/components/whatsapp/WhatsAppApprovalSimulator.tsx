'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WhatsAppSimulationContext } from '@/lib/services/whatsappSimulationService';

export interface WhatsAppApprovalSimulatorProps {
  context: WhatsAppSimulationContext;
  doctorReply: string | null;
  isSubmitting: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function WhatsAppApprovalSimulator({
  context,
  doctorReply,
  isSubmitting,
  disabled,
  onApprove,
  onReject,
}: WhatsAppApprovalSimulatorProps) {
  const centralLabel = context.centralWhatsAppNumber
    ? `+91 ${context.centralWhatsAppNumber}`
    : 'Conninter';

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border bg-[#e5ddd5] shadow-lg">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
          C
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">Conninter</p>
          <p className="truncate text-xs text-white/80">{centralLabel}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-center text-xs text-muted-foreground">
          To: Dr. {context.doctorName} ({context.doctorPhone || 'doctor'})
        </p>

        <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-white px-3 py-2 shadow-sm">
          <p className="whitespace-pre-wrap text-sm text-gray-900">{context.outboundMessage}</p>
          <p className="mt-1 text-right text-[10px] text-gray-500">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {context.supportsInteractiveButtons ? (
          <div className="flex justify-end gap-2 px-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50"
              disabled={disabled || isSubmitting}
              onClick={onApprove}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Yes
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-red-500 bg-white text-red-600 hover:bg-red-50"
              disabled={disabled || isSubmitting}
              onClick={onReject}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              No
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2 px-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50"
              disabled={disabled || isSubmitting}
              onClick={onApprove}
            >
              YES {context.approvalCode}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-red-500 bg-white text-red-600 hover:bg-red-50"
              disabled={disabled || isSubmitting}
              onClick={onReject}
            >
              NO {context.approvalCode}
            </Button>
          </div>
        )}

        {doctorReply && (
          <div className="mr-auto max-w-[90%] rounded-lg rounded-tl-none bg-[#dcf8c6] px-3 py-2 shadow-sm">
            <p className="text-sm text-gray-900">{doctorReply}</p>
            <p className="mt-1 text-right text-[10px] text-gray-500">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      <div className="border-t bg-white/60 px-4 py-2 text-center text-xs text-muted-foreground">
        {disabled
          ? 'This appointment was already processed.'
          : 'Tap Yes or No as the doctor would on WhatsApp.'}
      </div>
    </div>
  );
}
