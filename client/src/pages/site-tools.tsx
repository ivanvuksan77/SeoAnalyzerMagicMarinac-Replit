import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BotBlockedState, isFetchErrorCode } from "@/components/bot-blocked-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Loader2,
  LinkIcon,
  ImageIcon,
  Network,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Globe,
  FileCode,
  Map,
  Bot,
  ArrowRight,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/lib/seo";
import type {
  BrokenLinksResult,
  BrokenLink,
  ImageOptimizationResult,
  ImageIssue,
  InternalLinkingResult,
  SitemapValidatorResult,
} from "@shared/schema";

type ActiveTool = "broken-links" | "image-optimization" | "internal-linking" | "sitemap-validator";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

const tools = [
  { id: "broken-links" as ActiveTool, label: "Broken Links", icon: LinkIcon, description: "Find dead links on your page" },
  { id: "image-optimization" as ActiveTool, label: "Image Optimization", icon: ImageIcon, description: "Check image SEO & performance" },
  { id: "internal-linking" as ActiveTool, label: "Internal Linking", icon: Network, description: "Analyze internal link structure" },
  { id: "sitemap-validator" as ActiveTool, label: "Sitemap & Robots.txt", icon: FileText, description: "Validate sitemap & robots.txt" },
];

function StatusIcon({ status }: { status: "pass" | "fail" | "warning" }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-500" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-2xl font-bold">{score}</span>
      <span className="text-muted-foreground">/100</span>
    </div>
  );
}

function BrokenLinksResults({ data }: { data: BrokenLinksResult }) {
  const [showAll, setShowAll] = useState(false);
  const [showRedirects, setShowRedirects] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <ScoreBadge score={data.score} />
            <p className="text-sm text-muted-foreground mt-1">Health Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{data.totalLinks}</p>
            <p className="text-sm text-muted-foreground">Total Links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-500">{data.brokenCount}</p>
            <p className="text-sm text-muted-foreground">Broken</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-500">{data.redirectCount}</p>
            <p className="text-sm text-muted-foreground">Redirects</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">{data.summary}</p>
          <div className="flex gap-4 mt-3">
            <Badge variant="outline" className="text-green-600 border-green-200">
              {data.workingLinks} Working
            </Badge>
            <Badge variant="outline">{data.internalLinks} Internal</Badge>
            <Badge variant="outline">{data.externalLinks} External</Badge>
          </div>
        </CardContent>
      </Card>

      {data.brokenLinks.length > 0 && (
        <Card data-testid="broken-links-list">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Broken Links ({data.brokenLinks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(showAll ? data.brokenLinks : data.brokenLinks.slice(0, 10)).map((link, i) => (
                <BrokenLinkRow key={i} link={link} />
              ))}
              {data.brokenLinks.length > 10 && (
                <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full">
                  {showAll ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {showAll ? "Show Less" : `Show All ${data.brokenLinks.length} Broken Links`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.redirectedLinks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Redirected Links ({data.redirectedLinks.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowRedirects(!showRedirects)} data-testid="redirects-toggle">
                {showRedirects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          {showRedirects && (
            <CardContent>
              <div className="space-y-3">
                {data.redirectedLinks.slice(0, 20).map((link, i) => (
                  <BrokenLinkRow key={i} link={link} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {data.skippedLinks && data.skippedLinks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-500" />
                Skipped Links ({data.skippedLinks.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowSkipped(!showSkipped)} data-testid="skipped-toggle">
                {showSkipped ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Social media platforms block automated link checks. These links are likely fine.</p>
          </CardHeader>
          {showSkipped && (
            <CardContent>
              <div className="space-y-3">
                {data.skippedLinks.map((link, i) => (
                  <BrokenLinkRow key={i} link={link} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function BrokenLinkRow({ link }: { link: BrokenLink }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
      <div className="mt-1">
        {link.statusText.startsWith("Skipped") ? (
          <AlertTriangle className="w-4 h-4 text-blue-500" />
        ) : link.statusCode === null ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : link.statusCode >= 400 ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{link.url}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Anchor: "{link.anchorText}" · {link.type} · {link.location}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={link.statusText.startsWith("Skipped") ? "outline" : link.statusCode === null || link.statusCode >= 400 ? "destructive" : "secondary"} className={link.statusText.startsWith("Skipped") ? "text-blue-600 border-blue-200" : ""}>
          {link.statusText.startsWith("Skipped") ? "Skipped" : `${link.statusCode ?? "N/A"} ${link.statusText}`}
        </Badge>
        {link.responseTime !== null && (
          <span className="text-xs text-muted-foreground">{link.responseTime}ms</span>
        )}
      </div>
    </div>
  );
}

function ImageOptResults({ data }: { data: ImageOptimizationResult }) {
  const [showImages, setShowImages] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <ScoreBadge score={data.score} />
            <p className="text-sm text-muted-foreground mt-1">Optimization Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{data.totalImages}</p>
            <p className="text-sm text-muted-foreground">Total Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-500">{data.modernFormatCount}</p>
            <p className="text-sm text-muted-foreground">Modern Format</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-red-500">{data.oversizedImages}</p>
            <p className="text-sm text-muted-foreground">Oversized</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="image-metrics">
        <CardHeader>
          <CardTitle className="text-lg">Optimization Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricBar label="Alt Text" value={data.imagesWithAlt} total={data.totalImages} />
          <MetricBar label="Lazy Loading" value={data.imagesWithLazyLoading} total={data.totalImages} />
          <MetricBar label="Explicit Dimensions" value={data.imagesWithDimensions} total={data.totalImages} />
          <MetricBar label="Responsive (srcset)" value={data.imagesWithSrcset} total={data.totalImages} />
          <MetricBar label="Modern Format" value={data.modernFormatCount} total={data.totalImages} />
        </CardContent>
      </Card>

      {data.recommendations.length > 0 && (
        <Card data-testid="image-recommendations">
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.images.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Image Details ({data.images.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowImages(!showImages)} data-testid="images-toggle">
                {showImages ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showImages ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          {showImages && (
            <CardContent>
              <div className="space-y-3">
                {data.images.map((img, i) => (
                  <ImageRow key={i} image={img} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function MetricBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}/{total} ({pct}%)</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function ImageRow({ image }: { image: ImageIssue }) {
  const hasIssues = image.issues.length > 0;
  return (
    <div className={`p-3 rounded-lg border ${hasIssues ? "border-yellow-200 bg-yellow-50/30 dark:border-yellow-900 dark:bg-yellow-950/20" : "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {hasIssues ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono truncate">{image.src.split("/").pop()}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {image.hasAlt && <Badge variant="outline" className="text-xs text-green-600">Alt ✓</Badge>}
            {!image.hasAlt && <Badge variant="outline" className="text-xs text-red-600">No Alt</Badge>}
            {image.hasLazyLoading && <Badge variant="outline" className="text-xs text-green-600">Lazy ✓</Badge>}
            {image.format && <Badge variant="outline" className="text-xs">{image.format}</Badge>}
            {image.fileSize && <Badge variant="outline" className="text-xs">{Math.round(image.fileSize / 1024)}KB</Badge>}
          </div>
          {hasIssues && (
            <ul className="mt-2 space-y-0.5">
              {image.issues.map((issue, j) => (
                <li key={j} className="text-xs text-muted-foreground">• {issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function InternalLinkingResults({ data }: { data: InternalLinkingResult }) {
  const [showLinks, setShowLinks] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <ScoreBadge score={data.score} />
            <p className="text-sm text-muted-foreground mt-1">Link Quality Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{data.totalInternalLinks}</p>
            <p className="text-sm text-muted-foreground">Total Internal Links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{data.uniqueInternalLinks}</p>
            <p className="text-sm text-muted-foreground">Unique Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-500">{data.descriptiveAnchors}</p>
            <p className="text-sm text-muted-foreground">Descriptive Anchors</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="linking-metrics">
        <CardHeader>
          <CardTitle className="text-lg">Link Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricBar label="Descriptive Anchor Text" value={data.descriptiveAnchors} total={data.totalInternalLinks} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">{data.genericAnchors}</p>
              <p className="text-xs text-muted-foreground">Generic Anchors</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{data.nofollowCount}</p>
              <p className="text-xs text-muted-foreground">Nofollow Links</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{data.deepLinks}</p>
              <p className="text-xs text-muted-foreground">Deep Links (3+)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{data.shallowLinks}</p>
              <p className="text-xs text-muted-foreground">Shallow Links</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {data.anchorTextDistribution.length > 0 && (
        <Card data-testid="anchor-distribution">
          <CardHeader>
            <CardTitle className="text-lg">Top Anchor Texts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.anchorTextDistribution.slice(0, 15).map((item, i) => (
                <Badge key={i} variant="secondary" className="text-sm">
                  {item.text} <span className="ml-1 opacity-60">×{item.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.recommendations.length > 0 && (
        <Card data-testid="linking-recommendations">
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.links.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">All Internal Links ({data.links.length})</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowLinks(!showLinks)} data-testid="links-toggle">
                {showLinks ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showLinks ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          {showLinks && (
            <CardContent>
              <div className="space-y-2">
                {data.links.slice(0, 50).map((link, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-mono text-xs">{link.url}</p>
                      <p className="text-xs text-muted-foreground">"{link.anchorText}" · depth {link.depth} · {link.location}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {link.isDescriptive ? (
                        <Badge variant="outline" className="text-xs text-green-600">Descriptive</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-600">Generic</Badge>
                      )}
                      {link.hasNofollow && <Badge variant="outline" className="text-xs text-red-600">nofollow</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function SitemapResults({ data }: { data: SitemapValidatorResult }) {
  const { robotsTxt, sitemap } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <ScoreBadge score={data.score} />
            <p className="text-sm text-muted-foreground mt-1">Validation Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              {robotsTxt.exists ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              <span className="text-lg font-bold">{robotsTxt.exists ? "Found" : "Missing"}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">robots.txt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              {sitemap.exists ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              <span className="text-lg font-bold">{sitemap.exists ? `${sitemap.urlCount} URLs` : "Missing"}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Sitemap</p>
          </CardContent>
        </Card>
      </div>

      {robotsTxt.exists && (
        <Card data-testid="robots-details">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5" />
              robots.txt Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">User Agents</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {robotsTxt.userAgents.map((ua, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{ua}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Disallowed Paths</p>
                <p className="text-sm text-muted-foreground">{robotsTxt.disallowedPaths.length} rules</p>
              </div>
              <div>
                <p className="text-sm font-medium">Sitemap References</p>
                <p className="text-sm text-muted-foreground">{robotsTxt.sitemapReferences.length} found</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="flex flex-col gap-1 mt-1">
                  {robotsTxt.hasWildcardBlock && <Badge variant="destructive" className="text-xs w-fit">Wildcard Block</Badge>}
                  {robotsTxt.blocksImportantPaths && <Badge variant="destructive" className="text-xs w-fit">Blocks Important Paths</Badge>}
                  {!robotsTxt.hasWildcardBlock && !robotsTxt.blocksImportantPaths && <Badge className="text-xs w-fit bg-green-500">Clean</Badge>}
                </div>
              </div>
            </div>

            {robotsTxt.disallowedPaths.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Disallowed Paths:</p>
                <div className="flex flex-wrap gap-1">
                  {robotsTxt.disallowedPaths.map((p, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            {robotsTxt.issues.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 text-yellow-600">Issues:</p>
                <ul className="space-y-1">
                  {robotsTxt.issues.map((issue, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sitemap.exists && (
        <Card data-testid="sitemap-details">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Map className="w-5 h-5" />
              Sitemap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{sitemap.urlCount}</p>
                <p className="text-xs text-muted-foreground">URLs</p>
              </div>
              <div>
                <StatusIcon status={sitemap.hasLastmod ? "pass" : "warning"} />
                <p className="text-xs text-muted-foreground mt-1">lastmod</p>
              </div>
              <div>
                <StatusIcon status={sitemap.hasChangefreq ? "pass" : "warning"} />
                <p className="text-xs text-muted-foreground mt-1">changefreq</p>
              </div>
              <div>
                <StatusIcon status={sitemap.hasPriority ? "pass" : "warning"} />
                <p className="text-xs text-muted-foreground mt-1">priority</p>
              </div>
            </div>

            {sitemap.isSitemapIndex && (
              <div>
                <p className="text-sm font-medium mb-1">Sitemap Index - Child Sitemaps:</p>
                <div className="space-y-1">
                  {sitemap.childSitemaps.slice(0, 10).map((sm, i) => (
                    <p key={i} className="text-xs font-mono truncate text-muted-foreground">{sm}</p>
                  ))}
                </div>
              </div>
            )}

            {sitemap.sampleUrls.length > 0 && !sitemap.isSitemapIndex && (
              <div>
                <p className="text-sm font-medium mb-1">Sample URLs:</p>
                <div className="space-y-1">
                  {sitemap.sampleUrls.slice(0, 5).map((u, i) => (
                    <p key={i} className="text-xs font-mono truncate text-muted-foreground">{u}</p>
                  ))}
                </div>
              </div>
            )}

            {sitemap.issues.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1 text-yellow-600">Issues:</p>
                <ul className="space-y-1">
                  {sitemap.issues.map((issue, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.recommendations.length > 0 && (
        <Card data-testid="sitemap-recommendations">
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SiteToolsPage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.siteTools.title"), description: t("seo.siteTools.description"), path: "/site-tools" });
  const [activeTool, setActiveTool] = useState<ActiveTool>("broken-links");
  const [brokenLinks, setBrokenLinks] = useState<BrokenLinksResult | null>(null);
  const [imageOpt, setImageOpt] = useState<ImageOptimizationResult | null>(null);
  const [internalLinks, setInternalLinks] = useState<InternalLinkingResult | null>(null);
  const [sitemapResult, setSitemapResult] = useState<SitemapValidatorResult | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const endpoints: Record<ActiveTool, string> = {
    "broken-links": "/api/broken-links",
    "image-optimization": "/api/image-optimization",
    "internal-linking": "/api/internal-linking",
    "sitemap-validator": "/api/sitemap-validator",
  };

  const toolLabels: Record<ActiveTool, string> = {
    "broken-links": "Broken Link Check",
    "image-optimization": "Image Optimization Analysis",
    "internal-linking": "Internal Linking Analysis",
    "sitemap-validator": "Sitemap & Robots.txt Validation",
  };

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", endpoints[activeTool], data);
      return response.json();
    },
    onSuccess: (result: any) => {
      toast({ title: "Analysis Complete", description: `${toolLabels[activeTool]} finished.` });
      if (activeTool === "broken-links") setBrokenLinks(result);
      else if (activeTool === "image-optimization") setImageOpt(result);
      else if (activeTool === "internal-linking") setInternalLinks(result);
      else if (activeTool === "sitemap-validator") setSitemapResult(result);
    },
    onError: (error: any) => {
      if (isFetchErrorCode(error?.code)) return;
      toast({ title: "Analysis Failed", description: error.message || "Something went wrong", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    analyzeMutation.mutate(values);
  };

  const currentResult = activeTool === "broken-links" ? brokenLinks
    : activeTool === "image-optimization" ? imageOpt
    : activeTool === "internal-linking" ? internalLinks
    : sitemapResult;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Search className="text-primary-foreground w-4 h-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-2xl font-bold text-foreground">SiteSnap</h1>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground">Scan. Snap. Fix What Matters.</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/master-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Master Analyzer</Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">SiteSnap</Link>
            <Link href="/ads-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Ads Landing Page</Link>
            <Link href="/aeo-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">AEO / AI SEO</Link>
            <Link href="/site-tools" className="text-foreground font-medium transition-colors">Site Tools</Link>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              <User className="w-4 h-4 mr-2 inline" />Account
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Site Analysis Tools</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Check your website for broken links, optimize images, analyze internal linking structure, and validate your sitemap & robots.txt.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                data-testid={`tool-tab-${tool.id}`}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeTool === tool.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${activeTool === tool.id ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-sm">{tool.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
              </button>
            );
          })}
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Enter website URL (e.g., https://example.com)"
                          {...field}
                          data-testid="site-tools-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={analyzeMutation.isPending} data-testid="site-tools-analyze">
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {!analyzeMutation.isPending && analyzeMutation.isError && isFetchErrorCode((analyzeMutation.error as any)?.code) && (
          <div className="mb-6">
            <BotBlockedState
              code={(analyzeMutation.error as any).code}
              url={form.getValues("url")}
              onRetry={() => {
                const values = form.getValues();
                analyzeMutation.reset();
                analyzeMutation.mutate(values);
              }}
            />
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Running {toolLabels[activeTool]}...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a moment while we scan the page.</p>
          </div>
        )}

        {!analyzeMutation.isPending && activeTool === "broken-links" && brokenLinks && (
          <BrokenLinksResults data={brokenLinks} />
        )}
        {!analyzeMutation.isPending && activeTool === "image-optimization" && imageOpt && (
          <ImageOptResults data={imageOpt} />
        )}
        {!analyzeMutation.isPending && activeTool === "internal-linking" && internalLinks && (
          <InternalLinkingResults data={internalLinks} />
        )}
        {!analyzeMutation.isPending && activeTool === "sitemap-validator" && sitemapResult && (
          <SitemapResults data={sitemapResult} />
        )}

        <footer className="bg-card border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <Search className="text-primary-foreground w-3 h-3" />
                </div>
                <span className="text-muted-foreground">&copy; 2024 SiteSnap. All rights reserved.</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <a href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</a>
                <a href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</a>
                <a href="#" className="text-muted-foreground hover:text-foreground">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
