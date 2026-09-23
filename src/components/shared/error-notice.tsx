"use client";

import { useEffect, useRef } from "react";
import { describeError } from "@/lib/german-labels";

export interface ErrorNoticeProps {
  errorCode: string;
  onRetry?: () => void;
  /** Lets a field or fieldset point at this notice with aria-describedby. */
  id?: string;
  /** Moves the focus here when the notice appears, so a failure is never missed off-screen. */
  shouldTakeFocus?: boolean;
}

export function ErrorNotice({ errorCode, onRetry, id, shouldTakeFocus }: ErrorNoticeProps) {
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldTakeFocus) noticeRef.current?.focus();
  }, [shouldTakeFocus, errorCode]);

  return (
    <div
      ref={noticeRef}
      id={id}
      role="alert"
      tabIndex={shouldTakeFocus ? -1 : undefined}
      className="card border-alert text-alert"
    >
      <p>{describeError(errorCode)}</p>
      {onRetry && (
        <button type="button" className="button-ghost mt-3" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
