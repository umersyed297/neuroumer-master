
'use client';

import { useState, useEffect } from 'react';
import { summarizeMalwareTrends, type SummarizeMalwareTrendsOutput } from '@/ai/flows/summarize-malware-trends';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info, Shield, TrendingUp, Clock, Zap, Target, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface MalwareBlock {
  title: string;
  points: string[];
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

const getSeverity = (points: string[]): 'critical' | 'high' | 'medium' | 'low' => {
  const text = points.join(' ').toLowerCase();
  if (text.includes('critical') || text.includes('ransomware') || text.includes('zero-day')) return 'critical';
  if (text.includes('high') || text.includes('exploit') || text.includes('vulnerability')) return 'high';
  if (text.includes('medium') || text.includes('phishing')) return 'medium';
  return 'low';
};

const severityConfig = {
  critical: {
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    label: 'CRITICAL',
    icon: Zap,
  },
  high: {
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    label: 'HIGH',
    icon: AlertTriangle,
  },
  medium: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/50',
    glow: 'shadow-[0_0_10px_rgba(234,179,8,0.3)]',
    label: 'MEDIUM',
    icon: Target,
  },
  low: {
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/50',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    label: 'LOW',
    icon: Activity,
  },
};

const parseSummary = (summaryText: string | undefined | any): { blocks: MalwareBlock[]; generalContent: string[] } => {
  if (!summaryText) {
    return { blocks: [], generalContent: [] };
  }

  // Ensure summaryText is a string
  const textToProcess = typeof summaryText === 'string' ? summaryText : String(summaryText);

  const blocks: MalwareBlock[] = [];
  let currentBlock: MalwareBlock | null = null;
  const generalContentLines: string[] = [];
  const lines = textToProcess.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Regex to capture titles like "MalwareNameX:" or "- MalwareNameX:"
    const malwareHeaderMatch = trimmedLine.match(/^(?:- *)?([A-Za-z0-9\s_().-]+):$/);
    const bulletMatch = line.match(/^\s*[\*\-]\s+(.*)/);

    if (malwareHeaderMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = { title: malwareHeaderMatch[1].trim(), points: [] };
    } else if (bulletMatch && currentBlock) {
      currentBlock.points.push(bulletMatch[1].trim());
    } else if (trimmedLine !== '') {
      // If a line is not a header or a bullet under a current block,
      // and currentBlock exists, finalize currentBlock.
      // Then, treat this line as general content.
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null; 
      }
      generalContentLines.push(trimmedLine);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return { blocks, generalContent: generalContentLines };
};

export function ThreatTrendsClient() {
  const [summaryData, setSummaryData] = useState<SummarizeMalwareTrendsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading on mount
  const [error, setError] = useState<string | null>(null);
  const [parsedOutput, setParsedOutput] = useState<{ blocks: MalwareBlock[]; generalContent: string[] }>({ blocks: [], generalContent: [] });

  const fetchTrends = async () => {
    setIsLoading(true);
    setError(null);
    setSummaryData(null);
    setParsedOutput({ blocks: [], generalContent: [] });
    
    try {
      const result = await summarizeMalwareTrends({ query: 'newly emerging malware families, notable recent incidents, and their attack tactics' }); 
      console.log('[ThreatTrendsClient] Received result:', result);
      console.log('[ThreatTrendsClient] Summary type:', typeof result?.summary);
      console.log('[ThreatTrendsClient] Summary value:', result?.summary);
      
      setSummaryData(result);
      if (result && result.summary) {
        setParsedOutput(parseSummary(result.summary));
      } else if (result && !result.summary) {
         setError('AI returned an empty summary for malware trends.');
         setParsedOutput({ blocks: [], generalContent: [] });
      } else {
        setError('Failed to retrieve data from the AI model.');
        setParsedOutput({ blocks: [], generalContent: [] });
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
      setParsedOutput({ blocks: [], generalContent: [] });
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

  if (!summaryData || (!parsedOutput.blocks.length && !parsedOutput.generalContent.length)) {
    return (
      <Alert>
        <Info className="h-5 w-5" />
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>
        Could not retrieve or parse threat summary at this time, or the summary was empty.
        <Button onClick={fetchTrends} variant="outline" size="sm" className="mt-4">
            Refresh Data
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div 
      className="space-y-8 max-w-7xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header Section */}
      <motion.div 
        className="cosmic-card p-6 border-2 border-accent/20 relative overflow-hidden"
        variants={itemVariants}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 rounded-xl bg-accent/10 border border-accent/30"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <TrendingUp className="h-8 w-8 text-accent" />
            </motion.div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-glow">Global Threat Intelligence</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1.5">
                <Clock className="h-4 w-4" />
                Real-time AI-powered analysis • Last updated: {new Date().toLocaleTimeString()}
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
              {isLoading ? 'Scanning...' : 'Refresh Intel'}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Threat Cards Grid */}
      <div className="grid gap-6">
        {parsedOutput.blocks.map((block, index) => {
          const severity = getSeverity(block.points);
          const config = severityConfig[severity];
          const SeverityIcon = config.icon;

          return (
            <motion.div key={index} variants={itemVariants}>
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`cosmic-card relative overflow-hidden border-l-4 ${config.border} ${config.glow} hover:shadow-2xl transition-all duration-300`}>
                  {/* Gradient Background */}
                  <div className={`absolute top-0 right-0 w-48 h-48 ${config.bg} rounded-full blur-3xl opacity-50`} />
                  
                  <CardHeader className="relative pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <motion.div 
                          className={`p-3 rounded-xl ${config.bg} border ${config.border}`}
                          whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Shield className={`h-6 w-6 ${config.color}`} />
                        </motion.div>
                        <div className="flex-1">
                          <CardTitle className="text-2xl font-bold text-foreground mb-2">
                            {block.title}
                          </CardTitle>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={`${config.bg} ${config.color} border ${config.border} font-bold px-3 py-1`}>
                              <SeverityIcon className="h-3 w-3 mr-1.5" />
                              {config.label} SEVERITY
                            </Badge>
                            <Badge variant="outline" className="text-muted-foreground">
                              Threat #{index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-muted-foreground">
                              {block.points.length} Indicators
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Attack Vectors & Tactics
                      </h4>
                      {block.points.map((point, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          whileHover={{ x: 5, scale: 1.01 }}
                          className="group"
                        >
                          <div className="flex gap-3 p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all border border-border/30 hover:border-border/60">
                            <div className="flex-shrink-0 mt-1">
                              <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
                            </div>
                            <p className="text-sm leading-relaxed text-foreground font-medium">
                              {point}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Strategic Outlook Section */}
      {parsedOutput.generalContent.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="cosmic-card border-2 border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <CardHeader className="relative">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <motion.div 
                  className="p-3 rounded-xl bg-primary/10 border border-primary/30"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <Info className="h-6 w-6 text-primary" />
                </motion.div>
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Strategic Intelligence Outlook
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {parsedOutput.generalContent.map((line, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.01, x: 5 }}
                    className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all"
                  >
                    <p className="text-base leading-relaxed text-foreground">
                      {line}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer Intelligence Badge */}
      <motion.div 
        variants={itemVariants}
        className="cosmic-card p-6 border border-accent/20 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5" />
        <div className="relative flex items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-semibold text-foreground">Live Intelligence Feed</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">
            Powered by AI • Global Threat Database
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm text-accent font-medium">
            {parsedOutput.blocks.length} Active Threats Detected
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
