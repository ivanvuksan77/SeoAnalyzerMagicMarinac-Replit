import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, CheckCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SeoAnalysis } from "@shared/schema";

interface AnalysisFormProps {
  onAnalysisComplete: (analysis: SeoAnalysis) => void;
}

export default function AnalysisForm({ onAnalysisComplete }: AnalysisFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const formSchema = z.object({
    url: z.string().url(t("legacy.analysisForm.validUrl")),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/analyze", data);
      return response.json();
    },
    onSuccess: (analysis: SeoAnalysis) => {
      toast({
        title: t("legacy.analysisForm.toastCompleteTitle"),
        description: t("legacy.analysisForm.toastCompleteDescription", { url: analysis.url }),
      });
      onAnalysisComplete(analysis);
    },
    onError: (error: any) => {
      toast({
        title: t("legacy.analysisForm.toastFailedTitle"),
        description: error.message || t("legacy.analysisForm.toastFailedDescription"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    analyzeMutation.mutate(values);
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm p-8 mb-8">
      <CardContent className="p-0">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">{t("legacy.analysisForm.title")}</h2>
          <p className="text-muted-foreground mb-8">
            {t("legacy.analysisForm.description")}
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder={t("legacy.analysisForm.placeholder")}
                            {...field}
                            className="px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                            data-testid="input-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={analyzeMutation.isPending}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("form.analyzing")}
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {t("legacy.analysisForm.analyze")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
          
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              {t("legacy.analysisForm.features.technicalSeo")}
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              {t("legacy.analysisForm.features.performanceAnalysis")}
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              {t("legacy.analysisForm.features.accessibilityCheck")}
            </span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              {t("legacy.analysisForm.features.pdfReport")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
