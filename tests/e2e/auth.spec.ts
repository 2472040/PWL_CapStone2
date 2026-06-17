import { test, expect } from '@playwright/test';

test.describe('Authentication and Routing Flow', () => {
  test('should redirect unauthenticated users to login page', async ({ page }) => {
    // Attempt to access dashboard
    await page.goto('/dashboard');

    // Expect redirection to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('.loka-login-heading')).toHaveText('Selamat datang');
  });

  test('should show error message on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Input invalid credentials
    await page.fill('#login-email', 'invalid@kampus.id');
    await page.fill('#login-password', 'wrongpassword');

    // Submit form
    await page.click('button.loka-login-btn');

    // Verify error box appears and contains validation text
    const errorBox = page.locator('.loka-login-error');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
    await expect(errorBox).toContainText(/salah|tidak/i);
  });

  test('should login successfully as Kalab and then logout', async ({ page }) => {
    await page.goto('/login');

    // Input valid Kalab credentials from DAFTAR_AKUN.md
    await page.fill('#login-email', 'pradipta@kampus.id');
    await page.fill('#login-password', 'password123');

    // Submit form
    await page.click('button.loka-login-btn');

    // Check we navigated to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Verify profile/sidebar elements show the logged-in user name
    const sidebar = page.locator('#main-sidebar');
    await expect(sidebar).toBeVisible();

    // Trigger logout modal by clicking the logout button in sidebar/settings
    // We can locate it via its role or title. In sidebar.tsx, line 213, it has onClick to open logout modal.
    // Let's click the logout button in the sidebar.
    const logoutBtn = page.locator('button[title="Keluar"]');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Confirm logout in modal
    const confirmBtn = page.locator('button:has-text("Ya, keluar")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Expect redirection back to login (or landing/login page)
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
