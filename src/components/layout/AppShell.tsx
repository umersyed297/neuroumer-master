
'use client';

import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, Search, Settings, User, Loader2, Sun, Moon, Hammer } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { mainNav, adminNav } from '@/config/nav';
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { MaintenanceDialog } from '@/components/layout/MaintenanceDialog';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

const STATIC_PROFILE_PIC_URL = '/images/rr.png';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading, logout, settings, settingsLoading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile, openMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const isAdminPage = pathname.startsWith('/admin');

  useEffect(() => {
    console.log('[AppShell] Theme provider mounted check.');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isMobile && openMobile && typeof setOpenMobile === 'function') {
      console.log('[AppShell] Mobile sidebar open, closing on path change:', pathname);
      setOpenMobile(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isMobile, openMobile]); 

  // This useEffect handles redirection based on auth state
  useEffect(() => {
    console.log('[AppShell] Auth effect. Path:', pathname, 'AuthLoading:', authLoading, 'User:', user ? user.uid : 'null');

    if (authLoading) {
      console.log('[AppShell] Auth is loading. No redirection action from AppShell effect yet.');
      return; // Wait for auth to resolve before making redirection decisions
    }

    const isAuthPage = pathname.startsWith('/auth/');

    if (!user && !isAuthPage) {
      console.log('[AppShell] Auth resolved: No user & not on auth page. Redirecting to /auth/login.');
      router.push('/auth/login');
    } else if (user && isAuthPage) {
      console.log('[AppShell] Auth resolved: User logged in but on auth page. Redirecting to /.');
      router.push('/');
    } else {
      console.log('[AppShell] Auth resolved: State OK for current page. No redirect needed from AppShell effect.');
    }
  }, [user, authLoading, pathname, router]);


  // --- Conditional rendering based on authentication status and current path ---
  const isAuthPage = pathname.startsWith('/auth/');

  // Show maintenance dialog if maintenance mode is on and user is not an admin
  const showMaintenance = Boolean(settings?.maintenanceMode && !isAdmin && user);

  // 1. If auth is still loading (initial check or during login/logout/signup),
  //    and we are NOT on an auth page, show a global loader.
  //    Auth pages manage their own loading UI if `authLoading` is true.
  if ((authLoading || settingsLoading) && !isAuthPage) {
    console.log('[AppShell] Render Case 1: Auth or settings loading, not on auth page. Showing main loader.');
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Initializing NeuroShield Interface...</p>
      </div>
    );
  }

  // 2. If auth is loading BUT we ARE on an auth page, let the auth page render its children
  //    (which might include its own loading indicators).
  if (authLoading && isAuthPage) {
     console.log('[AppShell] Render Case 2: Auth loading, IS on auth page. Rendering children.');
     return <>{children}</>;
  }

  // --- Auth is resolved (not loading) from this point for the rendering logic below ---

  // 3. Auth resolved, NO user, and NOT on an auth page (redirect to login is imminent or happening).
  //    Show a loader while the redirect from useEffect takes place.
  if (!user && !isAuthPage) {
    console.log('[AppShell] Render Case 3: Auth resolved, no user, not on auth page. Redirecting to login. Showing loader.');
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Securing connection...</p>
        </div>
    );
  }
  
  // 4. Auth resolved, USER exists, BUT on an auth page (redirect to dashboard is imminent or happening).
  //    Show a loader while the redirect from useEffect takes place.
  if (user && isAuthPage) {
    console.log('[AppShell] Render Case 4: Auth resolved, user exists, on auth page. Redirecting to dashboard. Showing loader.');
     return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Redirecting to dashboard...</p>
        </div>
    );
  }

  // 5. If it's an auth page, and we are here, it means: !authLoading and !user.
  //    This is a valid state to render the auth page content (login/signup forms).
  if (isAuthPage && !user) {
    // If registrations are disabled, show a message on the signup page
    if (pathname === '/auth/signup' && settings && !settings.newRegistrationsEnabled) {
        return <MaintenanceDialog isOpen={true} title="Registrations Disabled" description="New user registrations are currently disabled by the administrator." />;
    }
    console.log('[AppShell] Render Case 5: Rendering auth page children (e.g., login form). Pathname:', pathname);
    return <>{children}</>;
  }
  
  // 6. If we reach here, it implies: !authLoading, USER exists, and NOT on an auth page.
  //    A final check for user existence before rendering main app shell.
  if (!user) {
      // This case should ideally be caught by redirect logic if !isAuthPage.
      // It's a fallback if somehow user becomes null after initial checks on a protected route.
      console.warn('[AppShell] Render Case 6 Fallback: User is unexpectedly null on a protected route. Path:', pathname);
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Verifying access credentials...</p>
        </div>
      );
  }

  const currentNav = isAdminPage ? adminNav : mainNav;

  // --- Main AppShell UI for authenticated users on protected routes ---
  console.log('[AppShell] Render Case 7: Rendering main application shell UI for user:', user.uid, 'on path:', pathname);
  
  // Mobile-only layout
  if (isMobile) {
    return (
      <div className="w-full min-h-screen">
        <MaintenanceDialog isOpen={showMaintenance} />
        <MobileHeader user={user} isAdmin={isAdmin} onLogout={logout} />
        <main className="pb-20 pt-4 px-3 min-h-screen bg-background w-full max-w-full">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <>
      <MaintenanceDialog isOpen={showMaintenance} />
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-4 justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl text-primary group-data-[collapsible=icon]:hidden">NeuroShield</span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto">
          {currentNav.map((section, sectionIndex) => (
            <SidebarGroup key={sectionIndex} className="p-2">
              {section.title && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {section.title}
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      variant="default"
                      size="default"
                      tooltip={item.tooltip}
                      className="justify-start"
                      isActive={pathname === item.href}
                      disabled={item.disabled}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NeuroShield</p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background/80 backdrop-blur-sm px-3 sm:px-6 shadow-sm">
          <SidebarTrigger className="lg:hidden flex-shrink-0 -ml-2" aria-label="Toggle sidebar" />
          <div className="flex-1 min-w-0">
            {/* Optional: Breadcrumbs or Page Title can go here */}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex" aria-label="Search">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
            )}

            <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex" aria-label="Notifications">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            {authLoading ? ( 
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : user ? (
              <UserMenu user={user} onLogout={logout} />
            ) : (
              <Button asChild className="btn-glow">
                <Link href="/auth/login">Login</Link>
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto bg-background">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}

function UserMenu({ user, onLogout }: { user: { displayName?: string | null, email?: string | null, photoURL?: string | null }, onLogout: () => Promise<void> }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
        await onLogout();
    } catch (error) {
        console.error("[UserMenu] Error during logout:", error);
    } finally {
      // Only set to false if the component is still mounted.
      // If logout leads to immediate unmount/redirect, this might not be necessary
      // or could cause a warning if called on an unmounted component.
      // However, for robustness if onLogout itself fails and doesn't cause unmount:
      setIsLoggingOut(false); 
    }
  };

  const fallbackInitial = user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'N');
  const avatarSrc = user.photoURL || STATIC_PROFILE_PIC_URL; // Use photoURL from context if available, else static

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={avatarSrc} alt={user.displayName ?? 'User avatar'} data-ai-hint="profile picture"/>
            <AvatarFallback className="bg-secondary text-secondary-foreground text-lg">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName ?? 'Operative'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email ?? 'No email'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
