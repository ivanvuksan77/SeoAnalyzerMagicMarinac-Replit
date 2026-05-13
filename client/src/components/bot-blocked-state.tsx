import { useTranslation } from "react-i18next";
import { ShieldAlert, Clock, WifiOff, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type FetchErrorCode = "BOT_BLOCKED" | "FETCH_TIMEOUT" | "FETCH_NETWORK";

export function isFetchErrorCode(code: unknown): code is FetchErrorCode {
  return code === "BOT_BLOCKED" || code === "FETCH_TIMEOUT" || code === "FETCH_NETWORK";
}

const codeKeyMap: Record<FetchErrorCode, "botBlocked" | "fetchTimeout" | "fetchNetwork"> = {
  BOT_BLOCKED: "botBlocked",
  FETCH_TIMEOUT: "fetchTimeout",
  FETCH_NETWORK: "fetchNetwork",
};

const iconMap: Record<FetchErrorCode, any> = {
  BOT_BLOCKED: ShieldAlert,
  FETCH_TIMEOUT: Clock,
  FETCH_NETWORK: WifiOff,
};

interface BotBlockedStateProps {
  code: FetchErrorCode;
  url?: string;
  onRetry?: () => void;
  className?: string;
}

export function BotBlockedState({ code, url, onRetry, className }: BotBlockedStateProps) {
  const { t } = useTranslation();
  const ns = codeKeyMap[code];
  const Icon = iconMap[code];

  return (
    <Card
      className={`rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 shadow-sm ${className || ""}`}
      data-testid={`state-${code.toLowerCase()}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground" data-testid={`text-${code.toLowerCase()}-title`}>
              {t(`errors.${ns}.title`)}
            </h4>
            {url && (
              <p className="text-xs text-muted-foreground mt-1 break-all" data-testid={`text-${code.toLowerCase()}-url`}>
                {url}
              </p>
            )}
            <p className="text-sm text-foreground/80 mt-2">{t(`errors.${ns}.description`)}</p>
            {code === "BOT_BLOCKED" && (
              <p className="text-sm text-foreground/80 mt-2">{t(`errors.botBlocked.suggestion`)}</p>
            )}
            {onRetry && (
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  data-testid={`button-retry-${code.toLowerCase()}`}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t(`errors.${ns}.retry`)}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompareBlockedBadge({ code }: { code: FetchErrorCode }) {
  const { t } = useTranslation();
  const ns = codeKeyMap[code];
  const Icon = iconMap[code];
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-medium"
      data-testid={`badge-${code.toLowerCase()}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {t(`errors.${ns}.compareCardLabel`)}
    </div>
  );
}
