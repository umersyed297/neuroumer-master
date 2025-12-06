
'use client';

import { useState, useEffect } from 'react';
import { summarizeMalwareTrends, type SummarizeMalwareTrendsOutput } from '@/ai/flows/summarize-malware-trends';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info, Shield, TrendingUp, Clock, Zap, Target, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface ThreatData {
  number: number;
  name: string;
  type: string;
  attackMethod: string[];
  protection: string[];
}

const threatColors = [
  {
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    text: 'text-red-500',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  },
  {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    text: 'text-orange-500',
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
  },
  {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    text: 'text-yellow-500',
    glow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
  },
  {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    text: 'text-blue-500',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
  },
];

const parseSummary = (summaryText: string | undefined | any): ThreatData[] => {
  if (!summaryText) {
    return [];
  }

  const textToProcess = typeof summaryText === 'string' ? summaryText : String(summaryText);
  const threats: ThreatData[] = [];
  
  // Split by "Threat X:" pattern and keep the threat number
  const threatMatches = textToProcess.matchAll(/Threat (\d+):([\s\S]*?)(?=Threat \d+:|$)/gi);
  
  for (const match of threatMatches) {
    const threatNumber = parseInt(match[1]);
    if (threatNumber > 4) break; // Only process first 4 threats
    
    const block = match[2];
    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
    
    let name = '';
    let type = 'Unknown';
    const attackMethod: string[] = [];
    const protection: string[] = [];
    
    let currentSection = '';
    let foundName = false;
    
    for (const line of lines) {
      // Skip empty lines
      if (!line) continue;
      
      // Extract threat name (first non-section line)
      if (!foundName && !line.startsWith('-') && !line.startsWith('*') && 
          !line.toLowerCase().includes('type:') && 
          !line.toLowerCase().includes('attack method') && 
          !line.toLowerCase().includes('protection')) {
        name = line.replace(/^[:\-\*]\s*/, '').trim();
        foundName = true;
        continue;
      }
      
      // Detect sections
      if (line.toLowerCase().includes('type:') || line.toLowerCase().includes('class:')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          type = parts[1].trim();
        }
        currentSection = '';
      } else if (line.toLowerCase().includes('attack method')) {
        currentSection = 'attack';
      } else if (line.toLowerCase().includes('protection') || line.toLowerCase().includes('stay safe')) {
        currentSection = 'protection';
      } else if (line.startsWith('*') || line.startsWith('-')) {
        // Extract bullet point
        const point = line.replace(/^[\*\-]\s*/, '').trim();
        if (point) {
          if (currentSection === 'attack') {
            attackMethod.push(point);
          } else if (currentSection === 'protection') {
            protection.push(point);
          }
        }
      }
    }
    
    // Use threat number from regex if name not found
    if (!name) {
      name = `Malware Threat ${threatNumber}`;
    }
    
    threats.push({
      number: threatNumber,
      name,
      type: type || 'Unknown',
      attackMethod: attackMethod.length > 0 ? attackMethod : ['Information not available'],
      protection: protection.length > 0 ? protection : ['Stay vigilant and keep systems updated'],
    });
  }
  
  // Sort by threat number
  threats.sort((a, b) => a.number - b.number);
  
  // Ensure we always have exactly 4 threats
  while (threats.length < 4) {
    threats.push({
      number: threats.length + 1,
      name: `Analyzing Threat ${threats.length + 1}`,
      type: 'Pending Analysis',
      attackMethod: ['Data being collected from threat intelligence sources...'],
      protection: ['Stay updated with latest security patches'],
    });
  }
  
  return threats.slice(0, 4);
};

export function ThreatTrendsClient() {
  const [summaryData, setSummaryData] = useState<SummarizeMalwareTrendsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threats, setThreats] = useState<ThreatData[]>([]);

  const fetchTrends = async () => {
    setIsLoading(true);
    setError(null);
    setSummaryData(null);
    setThreats([]);
    
    try {
      const result = await summarizeMalwareTrends({ query: 'top 4 current malware threats' }); 
      console.log('[ThreatTrendsClient] Received result:', result);
      
      setSummaryData(result);
      if (result && result.summary) {
        const parsedThreats = parseSummary(result.summary);
        setThreats(parsedThreats);
      } else {
        setError('AI returned an empty summary for malware trends.');
        setThreats([]);
      }
    } catch (err: any) {
      console.error('[ThreatTrendsClient] Error fetching malware trends:', err);
      let detailedError = 'Failed to retrieve threat intelligence. The AI core might be offline or experiencing issues.';
      if (err.message) {
        // Check for specific Genkit/Google AI API key errors
        if (err.message.includes('API key not valid') || err.message.includes('PERMISSION_DENIED')) {
            detailedError = 'AI service access denied. Please ensure the GOOGLE_API_KEY is correctly configured and has permissions for the Gemini API.';
        } else {
            detailedError = err.message;
        }
      } else if (typeof err === 'string') {
        detailedError = err;
      } else if (err.error && typeof err.error === 'string') {
        detailedError = err.error;
      }
      setError(detailedError);
      setThreats([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold text-muted-foreground">Accessing AI Threat Matrix...</p>
        <p className="text-sm text-muted-foreground">Compiling latest global intelligence feeds.</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle>Intelligence Feed Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button onClick={fetchTrends} variant="outline" size="sm" className="mt-4 border-destructive text-destructive hover:bg-destructive/20">
            Retry Connection
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!summaryData || threats.length === 0) {
    return (
      <Alert>
        <Info className="h-5 w-5" />
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>
        Could not retrieve threat intelligence at this time.
        <Button onClick={fetchTrends} variant="outline" size="sm" className="mt-4">
            Refresh Data
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <motion.div 
        className="cosmic-card p-6 border-2 border-accent/20 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 rounded-xl bg-accent/10 border border-accent/30"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <Shield className="h-8 w-8 text-accent" />
            </motion.div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-glow">Top 4 Current Threats</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1.5">
                <Clock className="h-4 w-4" />
                Stay informed • Protect yourself • Updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={fetchTrends} 
              className="btn-glow bg-accent hover:bg-accent/90 text-white"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Updating...' : 'Refresh'}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Threat Boxes - 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {threats.map((threat, index) => {
          const colorConfig = threatColors[index];
          
          return (
            <motion.div
              key={threat.number}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -5 }}
            >
              <Card className={`cosmic-card relative overflow-hidden border-l-4 ${colorConfig.border} ${colorConfig.glow} h-full`}>
                {/* Gradient Background */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${colorConfig.bg} rounded-full blur-2xl opacity-50`} />
                
                {/* Number Badge */}
                <div className={`absolute top-4 right-4 w-12 h-12 rounded-full ${colorConfig.bg} border-2 ${colorConfig.border} flex items-center justify-center`}>
                  <span className={`text-2xl font-bold ${colorConfig.text}`}>{threat.number}</span>
                </div>
                
                <CardHeader className="relative pb-3">
                  <CardTitle className="text-xl font-bold text-foreground pr-16">
                    {threat.name}
                  </CardTitle>
                  <Badge className={`${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border} w-fit mt-2`}>
                    {threat.type}
                  </Badge>
                </CardHeader>
                
                <CardContent className="relative space-y-4">
                  {/* Attack Method */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      How It Attacks
                    </h4>
                    <ul className="space-y-1.5">
                      {threat.attackMethod.map((method, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground/90">
                          <span className={`${colorConfig.text} mt-1`}>•</span>
                          <span>{method}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Protection */}
                  <div>
                    <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      Stay Protected
                    </h4>
                    <ul className="space-y-1.5">
                      {threat.protection.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground/90">
                          <span className="text-green-500 mt-1">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div 
        className="cosmic-card p-4 border border-accent/20 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5" />
        <div className="relative flex items-center justify-center gap-3 text-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-semibold text-foreground">Live Threat Intelligence</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">
            AI-Powered Analysis
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-accent font-medium">
            4 Active Threats Monitored
          </span>
        </div>
      </motion.div>
    </div>
  );
}
