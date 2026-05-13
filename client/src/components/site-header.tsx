import { Dispatch, SetStateAction } from "react";
import { Link } from "wouter";
import { Check, Languages, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SiteHeaderProps = {
  title: string;
  slogan: string;
  languageLabel: string;
  languageEnglish: string;
  languageCroatian: string;
  toggleLangLabel: string;
  toggleDarkLabel: string;
  language: string;
  onLanguageChange: (language: "en" | "hr") => void;
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;
};

export default function SiteHeader({
  title,
  slogan,
  languageLabel,
  languageEnglish,
  languageCroatian,
  toggleLangLabel,
  toggleDarkLabel,
  language,
  onLanguageChange,
  darkMode,
  setDarkMode,
}: SiteHeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Search className="text-primary-foreground w-4 h-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground">{slogan}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 rounded-full gap-1.5"
                  aria-label={toggleLangLabel}
                  data-testid="button-language"
                >
                  <Languages className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">{language === "hr" ? "HR" : "EN"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuLabel>{languageLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onLanguageChange("en")} data-testid="lang-option-en">
                  {languageEnglish}
                  {language === "en" && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLanguageChange("hr")} data-testid="lang-option-hr">
                  {languageCroatian}
                  {language === "hr" && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-full"
              aria-label={toggleDarkLabel}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}