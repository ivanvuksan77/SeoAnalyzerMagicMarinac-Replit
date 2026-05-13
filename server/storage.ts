import { type SeoAnalysis, type InsertSeoAnalysis, type AdsAnalysis, type InsertAdsAnalysis, type AeoAnalysis, type InsertAeoAnalysis } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createSeoAnalysis(analysis: InsertSeoAnalysis): Promise<SeoAnalysis>;
  getSeoAnalysis(id: string): Promise<SeoAnalysis | undefined>;
  getSeoAnalysesByUrl(url: string): Promise<SeoAnalysis[]>;
  getAllSeoAnalyses(): Promise<SeoAnalysis[]>;
  createAdsAnalysis(analysis: InsertAdsAnalysis): Promise<AdsAnalysis>;
  getAdsAnalysis(id: string): Promise<AdsAnalysis | undefined>;
  getAllAdsAnalyses(): Promise<AdsAnalysis[]>;
  createAeoAnalysis(analysis: InsertAeoAnalysis): Promise<AeoAnalysis>;
  getAeoAnalysis(id: string): Promise<AeoAnalysis | undefined>;
  getAllAeoAnalyses(): Promise<AeoAnalysis[]>;
}

export class MemStorage implements IStorage {
  private seoAnalyses: Map<string, SeoAnalysis>;
  private adsAnalyses: Map<string, AdsAnalysis>;
  private aeoAnalyses: Map<string, AeoAnalysis>;

  constructor() {
    this.seoAnalyses = new Map();
    this.adsAnalyses = new Map();
    this.aeoAnalyses = new Map();
  }

  async createSeoAnalysis(insertAnalysis: InsertSeoAnalysis): Promise<SeoAnalysis> {
    const id = randomUUID();
    const analysis: SeoAnalysis = { 
      ...insertAnalysis, 
      id,
      createdAt: new Date()
    };
    this.seoAnalyses.set(id, analysis);
    return analysis;
  }

  async getSeoAnalysis(id: string): Promise<SeoAnalysis | undefined> {
    return this.seoAnalyses.get(id);
  }

  async getSeoAnalysesByUrl(url: string): Promise<SeoAnalysis[]> {
    return Array.from(this.seoAnalyses.values()).filter(
      (analysis) => analysis.url === url
    );
  }

  async getAllSeoAnalyses(): Promise<SeoAnalysis[]> {
    return Array.from(this.seoAnalyses.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createAdsAnalysis(insertAnalysis: InsertAdsAnalysis): Promise<AdsAnalysis> {
    const id = randomUUID();
    const analysis: AdsAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date()
    };
    this.adsAnalyses.set(id, analysis);
    return analysis;
  }

  async getAdsAnalysis(id: string): Promise<AdsAnalysis | undefined> {
    return this.adsAnalyses.get(id);
  }

  async getAllAdsAnalyses(): Promise<AdsAnalysis[]> {
    return Array.from(this.adsAnalyses.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createAeoAnalysis(insertAnalysis: InsertAeoAnalysis): Promise<AeoAnalysis> {
    const id = randomUUID();
    const analysis: AeoAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date()
    };
    this.aeoAnalyses.set(id, analysis);
    return analysis;
  }

  async getAeoAnalysis(id: string): Promise<AeoAnalysis | undefined> {
    return this.aeoAnalyses.get(id);
  }

  async getAllAeoAnalyses(): Promise<AeoAnalysis[]> {
    return Array.from(this.aeoAnalyses.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
}

export const storage = new MemStorage();
