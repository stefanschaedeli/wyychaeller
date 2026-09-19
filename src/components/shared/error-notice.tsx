import { describeError } from "@/lib/german-labels";

export function ErrorNotice({ errorCode, onRetry }: { errorCode: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card border-alert text-alert">
      <p>{describeError(errorCode)}</p>
      {onRetry && (
        <button type="button" className="button-ghost mt-3" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
