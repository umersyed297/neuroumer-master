
import { AppShell } from '@/components/layout/AppShell';
import { ThreatTrendsClient } from '@/components/trends/ThreatTrendsClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BrainCircuit } from 'lucide-react';

export default function ThreatTrendsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Global Malware Threatscape
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights into the latest cybersecurity threats, tactics, and techniques.
          </p>
        </header>

        <Card className="shadow-xl border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                AI-Generated Trend Summary
            </CardTitle>
            <CardDescription>
              Analysis based on recent global cybersecurity intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThreatTrendsClient />
          </CardContent>
        </Card>

        {/* Removed placeholder "Emerging Threat Vectors" card as it was static and not data-driven */}
        {/*
        <Card className="shadow-lg border-accent/20">
            <CardHeader>
                <CardTitle className="text-xl text-accent">Emerging Threat Vectors</CardTitle>
                <CardDescription>Key areas of concern and evolving attack methodologies.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                    <p>Further analysis of threat data will be available in future updates.</p>
                </div>
            </CardContent>
        </Card>
        */}

      </div>
    </AppShell>
  );
}
