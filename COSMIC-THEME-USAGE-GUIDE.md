# Cosmic Theme Usage Guide

## 🎨 Components Created

### 1. StarfieldBackground
**Location:** `src/components/cosmic/StarfieldBackground.tsx`

3D animated starfield with parallax mouse tracking.

```tsx
import { StarfieldBackground } from '@/components/cosmic';

// Already integrated in layout.tsx
<StarfieldBackground />
```

### 2. CosmicPortalLoader
**Location:** `src/components/cosmic/CosmicPortalLoader.tsx`

Animated loading screen with drawing rings effect.

```tsx
import { CosmicPortalLoader } from '@/components/cosmic';

const [loading, setLoading] = useState(true);

<CosmicPortalLoader 
  onComplete={() => setLoading(false)} 
  duration={2500} 
/>
```

### 3. TiltCard
**Location:** `src/components/cosmic/TiltCard.tsx`

3D tilt effect on mouse hover.

```tsx
import { TiltCard } from '@/components/cosmic';

<TiltCard className="p-6" tiltAmount={15}>
  <YourContent />
</TiltCard>
```

### 4. GlowButton
**Location:** `src/components/cosmic/GlowButton.tsx`

Button with neon glow and shine effect.

```tsx
import { GlowButton } from '@/components/cosmic';

<GlowButton variant="default" size="lg">
  Click Me
</GlowButton>
```

### 5. GlowInput
**Location:** `src/components/cosmic/GlowInput.tsx`

Input field with electric blue glow on focus.

```tsx
import { GlowInput } from '@/components/cosmic';

<GlowInput 
  type="text" 
  placeholder="Enter text..." 
/>
```

### 6. PageTransition
**Location:** `src/components/cosmic/PageTransition.tsx`

Smooth page transitions with fade and slide.

```tsx
import { PageTransition } from '@/components/cosmic';

<PageTransition>
  <YourPageContent />
</PageTransition>
```

## 🎯 CSS Classes Available

### Glow Effects
```tsx
// Button glow
<button className="btn-glow">Button</button>

// Input glow (auto-applied on focus)
<input className="input-glow" />

// Text glow
<h1 className="text-glow">Glowing Text</h1>

// Pulse glow animation
<div className="animate-pulse-glow">Pulsing Element</div>
```

### Card Effects
```tsx
// Cosmic card with frosted glass
<div className="cosmic-card">Content</div>

// Card with hover lift
<div className="card-hover-effect">Content</div>

// Card with primary glow
<div className="card-hover-effect-primary">Content</div>

// Card with accent glow
<div className="card-hover-effect-accent">Content</div>
```

## 🚀 Framer Motion Patterns

### Staggered Children Animation
```tsx
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
    transition: { duration: 0.5 },
  },
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>Item 1</motion.div>
  <motion.div variants={itemVariants}>Item 2</motion.div>
  <motion.div variants={itemVariants}>Item 3</motion.div>
</motion.div>
```

### Hover Effects
```tsx
<motion.div
  whileHover={{ scale: 1.05, y: -5 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### Icon Rotation on Hover
```tsx
<motion.div
  whileHover={{ rotate: 360, scale: 1.1 }}
  transition={{ duration: 0.6 }}
>
  <Icon />
</motion.div>
```

## 🎨 Color Usage

### Primary (Violet)
```tsx
// Text
<span className="text-primary">Text</span>

// Background
<div className="bg-primary">Content</div>

// Border
<div className="border-primary">Content</div>
```

### Accent (Electric Blue - THE GLOW COLOR)
```tsx
// Text
<span className="text-accent">Text</span>

// Background
<div className="bg-accent">Content</div>

// Border with glow
<div className="border-accent shadow-[0_0_15px_hsl(var(--accent)/0.5)]">
  Content
</div>
```

### Muted Foreground (Gray)
```tsx
<span className="text-muted-foreground">Secondary text</span>
```

### Destructive (Red)
```tsx
<span className="text-destructive">Error message</span>
```

## 📐 Layout Patterns

### Cosmic Card with Gradient
```tsx
<Card className="cosmic-card relative overflow-hidden">
  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
  <CardHeader className="relative">
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent className="relative">
    Content
  </CardContent>
</Card>
```

### Status Indicator with Pulse
```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
  <span>Operational</span>
</div>
```

### Hover List Items
```tsx
<motion.li
  className="p-3 rounded-lg bg-muted/20 border border-border/30"
  whileHover={{ scale: 1.02, x: 5 }}
  transition={{ duration: 0.2 }}
>
  Content
</motion.li>
```

## 🎭 Complete Example: Feature Card

```tsx
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/cosmic';
import { Shield } from 'lucide-react';

export function FeatureCard() {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="cosmic-card border-primary/20 relative overflow-hidden">
        {/* Gradient decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
        
        <CardHeader className="relative">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="p-3 rounded-lg bg-primary/10 border border-primary/20 w-fit"
          >
            <Shield className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-xl mt-4">Feature Title</CardTitle>
          <CardDescription>Feature description</CardDescription>
        </CardHeader>
        
        <CardContent className="relative">
          <GlowButton className="w-full">
            Take Action
          </GlowButton>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

## 🔧 Customization

### Adjust Glow Intensity
```css
/* In globals.css */
.custom-glow {
  box-shadow: 0 0 20px hsl(var(--accent) / 0.6), 
              0 0 40px hsl(var(--accent) / 0.3),
              0 0 60px hsl(var(--accent) / 0.1);
}
```

### Custom Tilt Amount
```tsx
<TiltCard tiltAmount={20}>
  More dramatic tilt
</TiltCard>
```

### Custom Animation Duration
```tsx
<CosmicPortalLoader duration={3000} />
```

## 📱 Responsive Considerations

The theme is fully responsive. Key breakpoints:
- Mobile: Full-width cards, reduced glow effects
- Tablet: 2-column grid
- Desktop: 3-column grid, full effects

## ⚡ Performance Tips

1. **Starfield**: Automatically optimized with `requestAnimationFrame`
2. **Animations**: Use `will-change` sparingly
3. **Glow effects**: CSS box-shadow is GPU-accelerated
4. **Framer Motion**: Uses transform and opacity (GPU-accelerated)

## 🎬 Animation Best Practices

1. **Stagger delays**: 0.1s between items
2. **Hover duration**: 0.2-0.3s
3. **Page transitions**: 0.4s
4. **Loader duration**: 2.5s
5. **Icon rotations**: 0.6s

---

**Status**: All components created and integrated
**Next**: Apply to remaining pages and forms
