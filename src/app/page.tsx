
'use client';

import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, Link2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { CosmicPortalLoader } from '@/components/cosmic/CosmicPortalLoader';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export default function DashboardPage() {
  const [showLoader, setShowLoader] = useState(true);

  return (
    <>
      {showLoader && <CosmicPortalLoader onComplete={() => setShowLoader(false)} duration={2500} />}
      <AppShell>
      <motion.div 
        className="flex flex-col gap-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.header variants={itemVariants}>
          <h1 className="text-4xl font-bold tracking-tight text-primary text-glow">NeuroShield Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, <span className="text-accent font-semibold">Operator</span>. Your AI-driven malware intelligence hub.
          </p>
        </motion.header>

        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <ActionCard
              title="Scan File"
              description="Upload and analyze suspicious files for malware."
              icon={UploadCloud}
              href="/scan/file"
              actionText="Upload File"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ActionCard
              title="Scan URL"
              description="Check URLs for phishing, and malicious content."
              icon={Link2}
              href="/scan/url"
              actionText="Analyze URL"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ActionCard
              title="Threat Trends"
              description="Explore AI-generated summaries of global malware."
              icon={TrendingUp}
              href="/threat-trends"
              actionText="View Trends"
            />
          </motion.div>
        </motion.div>

        {/* System Status Card */}
        <motion.div variants={itemVariants}>
          <Card className="cosmic-card shadow-xl border-accent/20 card-hover-effect-accent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="text-2xl text-accent flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-glow" />
                System Status
              </CardTitle>
              <CardDescription>Current operational status of NeuroShield services.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-4">
                <motion.li 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                  whileHover={{ scale: 1.02, x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-foreground font-medium">NeuroShield Intelligence:</span>
                  <span className="text-green-400 font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Operational
                  </span>
                </motion.li>
                <motion.li 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                  whileHover={{ scale: 1.02, x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-foreground font-medium">AI Analysis Engine:</span>
                  <span className="text-green-400 font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Optimal
                  </span>
                </motion.li>
                <motion.li 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                  whileHover={{ scale: 1.02, x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-foreground font-medium">Report Database:</span>
                  <span className="text-green-400 font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Connected
                  </span>
                </motion.li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      </AppShell>
    </>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  actionText: string;
}

// Memoize ActionCard to prevent unnecessary re-renders
const ActionCard = React.memo(function ActionCard({ title, description, icon: Icon, href, actionText }: ActionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="cosmic-card border-primary/20 shadow-lg card-hover-effect-primary relative overflow-hidden h-full">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
        <CardHeader className="flex flex-row items-center gap-4 pb-4 relative">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="p-3 rounded-lg bg-primary/10 border border-primary/20"
          >
            <Icon className="h-8 w-8 text-primary" />
          </motion.div>
          <div>
            <CardTitle className="text-xl text-foreground">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <Button asChild className="w-full btn-glow bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={href}>{actionText}</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
});
