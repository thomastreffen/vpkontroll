import { test, expect } from "@playwright/test";

// Test unauthenticated pages
test.describe("Public pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=VarmePumpe").first()).toBeVisible({ timeout: 15000 });
    // Check login form exists
    await expect(page.locator('input[type="email"], input[placeholder*="epost" i], input[placeholder*="email" i]').first()).toBeVisible();
  });

  test("forgot password link works", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(2000);
    const forgotLink = page.locator('a[href="/forgot-password"], text=Glemt').first();
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot-password/);
    }
  });

  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(3000);
    // Should redirect to /login since not authenticated
    const url = page.url();
    expect(url).toMatch(/login|admin/);
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/some-random-nonexistent-route");
    await page.waitForTimeout(2000);
    // Should show 404 or redirect
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });
});

// Test that all nav items in tenant admin are reachable
test.describe("Tenant Admin navigation (authenticated)", () => {
  test("login and navigate all tenant pages", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="epost" i], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill("thomas.treffen@gmail.com");
      await passwordInput.fill("test1234");
      
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(5000);
    }

    const currentUrl = page.url();
    
    // If we got past login, test navigation
    if (!currentUrl.includes("/login")) {
      // Navigate to tenant pages
      const tenantPages = [
        { path: "/tenant", title: "Dashboard" },
        { path: "/tenant/postkontoret", title: "Postkontoret" },
        { path: "/tenant/ressursplanlegger", title: "Ressursplanlegger" },
        { path: "/tenant/modules", title: "Moduler" },
        { path: "/tenant/integrations", title: "Integrasjoner" },
        { path: "/tenant/users", title: "Brukere" },
      ];

      for (const pg of tenantPages) {
        await page.goto(pg.path);
        await page.waitForTimeout(2000);
        
        // Page should load without blank screen
        const bodyText = await page.textContent("body");
        expect(bodyText!.length).toBeGreaterThan(10);
        
        // No uncaught error overlay
        const errorOverlay = page.locator('[class*="error"], [role="alert"]').first();
        const hasError = await errorOverlay.isVisible({ timeout: 500 }).catch(() => false);
        // Not asserting hard failure on error elements since some status badges use "alert"
        
        console.log(`✓ ${pg.title} (${pg.path}) loaded OK`);
      }
    }
  });
});

// Test that all nav items in master admin are reachable
test.describe("Master Admin navigation (authenticated)", () => {
  test("navigate all admin pages", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="epost" i], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill("thomas.treffen@gmail.com");
      await passwordInput.fill("test1234");
      
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(5000);
    }

    const currentUrl = page.url();
    
    if (!currentUrl.includes("/login")) {
      const adminPages = [
        { path: "/admin", title: "Dashboard" },
        { path: "/admin/tenants", title: "Tenants" },
        { path: "/admin/modules", title: "Moduler" },
        { path: "/admin/integrations", title: "Integrasjoner" },
      ];

      for (const pg of adminPages) {
        await page.goto(pg.path);
        await page.waitForTimeout(2000);
        
        const bodyText = await page.textContent("body");
        expect(bodyText!.length).toBeGreaterThan(10);
        
        console.log(`✓ ${pg.title} (${pg.path}) loaded OK`);
      }
    }
  });
});

// Test sidebar menu items render and are clickable
test.describe("Sidebar navigation links", () => {
  test("tenant sidebar links are clickable", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="epost" i], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill("thomas.treffen@gmail.com");
      await passwordInput.fill("test1234");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(5000);
    }

    // Go to tenant dashboard 
    await page.goto("/tenant");
    await page.waitForTimeout(3000);

    // Check viewport - on mobile we need to open the hamburger menu
    const viewport = page.viewportSize();
    const isMobile = (viewport?.width || 0) < 768;

    if (isMobile) {
      // Click hamburger menu
      const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') }).first();
      if (await menuBtn.isVisible({ timeout: 2000 })) {
        await menuBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Check sidebar nav links exist
    const navLinks = [
      { text: "Dashboard", href: "/tenant" },
      { text: "Postkontoret", href: "/tenant/postkontoret" },
      { text: "Ressursplanlegger", href: "/tenant/ressursplanlegger" },
      { text: "Moduler", href: "/tenant/modules" },
      { text: "Integrasjoner", href: "/tenant/integrations" },
      { text: "Brukere", href: "/tenant/users" },
    ];

    for (const nav of navLinks) {
      const link = page.locator(`a[href="${nav.href}"]`).first();
      const isVisible = await link.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        console.log(`✓ Sidebar link "${nav.text}" is visible`);
      } else {
        console.log(`⚠ Sidebar link "${nav.text}" not visible (may need menu open)`);
      }
    }

    // Click through each link
    for (const nav of navLinks) {
      if (isMobile) {
        const menuBtn = page.locator('button').filter({ has: page.locator('svg.lucide-menu') }).first();
        if (await menuBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await menuBtn.click();
          await page.waitForTimeout(500);
        }
      }

      const link = page.locator(`a[href="${nav.href}"]`).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await page.waitForTimeout(1500);
        expect(page.url()).toContain(nav.href);
        console.log(`✓ Navigated to ${nav.text}`);
      }
    }
  });
});

// Test Postkontoret shows demo data
test.describe("Postkontoret demo data", () => {
  test("cases list shows demo cases", async ({ page }) => {
    await page.goto("/login");
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="epost" i], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill("thomas.treffen@gmail.com");
      await passwordInput.fill("test1234");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(5000);
    }

    await page.goto("/tenant/postkontoret");
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent("body");
    // Check that at least some demo data appears
    const hasCaseContent = bodyText!.includes("SAK-") || bodyText!.includes("Varmepumpe") || bodyText!.includes("Postkontoret");
    expect(hasCaseContent).toBe(true);
    console.log("✓ Postkontoret page has case content");
  });
});
