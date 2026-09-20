"use client";

import { useCallback, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { parseOptionalInteger } from "@/lib/form-values";
import { runUserAction } from "@/lib/run-user-action";
import { useApiResource } from "@/lib/use-api-resource";
import type { SettingsResponse } from "@/shared/api-contract";

function SettingsForm({ initialSettings }: { initialSettings: SettingsResponse }) {
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [limitText, setLimitText] = useState(String(initialSettings.monthlyAiCallLimit));
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    const monthlyAiCallLimit = parseOptionalInteger(limitText);
    if (monthlyAiCallLimit === null) {
      setErrorCode("invalidInput");
      setIsSaved(false);
      return;
    }
    await runUserAction(
      () => apiClient.saveSettings({ currency: currency.trim().toUpperCase(), monthlyAiCallLimit }),
      {
        onStart: () => {
          setErrorCode(null);
          setIsSaved(false);
        },
        onSuccess: () => setIsSaved(true),
        onError: (code) => setErrorCode(code),
      },
    );
  }

  return (
    <form onSubmit={(event) => void saveSettings(event)} className="grid max-w-md gap-4">
      <TextField
        label="Währung (dreistelliger Code, z. B. CHF)"
        value={currency}
        onChange={setCurrency}
        maximumLength={3}
      />
      <p className="-mt-2 text-sm text-ink-muted">
        Eine neue Währung gilt für Preisrecherchen ab dem nächsten Neustart des Containers.
      </p>
      <TextField
        label="Monatliche Obergrenze für KI-Aufrufe"
        value={limitText}
        onChange={setLimitText}
        inputMode="numeric"
      />
      <p className="-mt-2 text-sm text-ink-muted">
        Ein erfasster Wein braucht zwei Aufrufe, eine Essensanfrage einen.
      </p>
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      {isSaved && <p role="status">Gespeichert</p>}
      <button type="submit" className="button-primary">
        Einstellungen speichern
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const settings = useApiResource(useCallback(() => apiClient.getSettings(), []));

  return (
    <>
      <PageHeader eyebrow="Mehr" title="Einstellungen" />
      {settings.errorCode && (
        <ErrorNotice errorCode={settings.errorCode} onRetry={settings.reload} />
      )}
      {settings.data && <SettingsForm initialSettings={settings.data} />}
    </>
  );
}
