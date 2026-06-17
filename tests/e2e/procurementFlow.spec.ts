import { test, expect } from '@playwright/test';

test.describe('Procurement Workflow E2E', () => {
  const draftTitle = `E2E Pengadaan Lab Komputasi ${Date.now()}`;

  test('should complete the entire procurement lifecycle', async ({ page }) => {
    // === 1. Log in as Kalab ===
    await page.goto('/login');
    await page.fill('#login-email', 'pradipta@kampus.id');
    await page.fill('#login-password', 'password123');
    await page.click('button.loka-login-btn');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to procurement page
    await page.click('.sb-item:has-text("Pengadaan")');
    await expect(page).toHaveURL(/\/dashboard\/procurement|\/dashboard\/pengadaan/);

    // Click create draft
    await page.click('button:has-text("Buat draf baru")');

    // Fill draft details
    await page.fill('.drawer-body .field input', draftTitle);
    await page.fill('input[placeholder="Nama barang…"]', 'Server Rack Xeon');
    await page.fill('input[placeholder="Jumlah"]', '1');
    await page.fill('input[placeholder="Satuan (unit/pcs)"]', 'unit');
    await page.fill('input[placeholder="Harga Satuan (Rp)"]', '25000000');

    // Submit to Kaprodi
    await page.click('button:has-text("Ajukan ke Kaprodi")');

    // Wait for drawer to close and toast to appear
    await expect(page.locator('.toast').last()).toContainText(/diajukan|sukses/i);

    // Logout Kalab
    await page.click('button[title="Keluar"]');
    await page.click('button:has-text("Ya, keluar")');
    await expect(page).toHaveURL(/\/login/);

    // === 2. Log in as Kaprodi ===
    await page.goto('/login');
    await page.fill('#login-email', 'hendra@kampus.id');
    await page.fill('#login-password', 'password123');
    await page.click('button.loka-login-btn');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Review page
    await page.click('.sb-item:has-text("Review pengadaan")');
    await expect(page).toHaveURL(/\/dashboard\/review/);

    // Find our draft card and click "Setujui Semua" and "Finalisasi Draf"
    const card = page.locator(`.card:has-text("${draftTitle}")`);
    await expect(card).toBeVisible();

    // Click Setujui Semua
    await card.locator('button:has-text("Setujui Semua")').click();
    // Verify toast or updated stats
    await expect(card.locator('text=1 disetujui')).toBeVisible();

    // Click Finalisasi Draf
    await card.locator('button:has-text("Finalisasi Draf")').click();
    await expect(page.locator('.toast').last()).toContainText(/difinalisasi|sukses/i);

    // Logout Kaprodi
    await page.click('button[title="Keluar"]');
    await page.click('button:has-text("Ya, keluar")');
    await expect(page).toHaveURL(/\/login/);

    // === 3. Log in as Admin ===
    await page.goto('/login');
    await page.fill('#login-email', 'faqih@kampus.id');
    await page.fill('#login-password', 'password123');
    await page.click('button.loka-login-btn');
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Receiving page
    await page.click('.sb-item:has-text("Penerimaan")');
    await expect(page).toHaveURL(/\/dashboard\/receiving/);

    // Find finalized draft and open details
    const receiveCard = page.locator(`.draft-card:has-text("${draftTitle}")`);
    await expect(receiveCard).toBeVisible();
    await receiveCard.click();

    // Scope receiving form actions to the item card to avoid conflict with bulk receive inputs
    const itemCard = page.locator('.p-5', { hasText: 'Server Rack Xeon' }).first();
    await expect(itemCard).toBeVisible();

    // Click "Tandai diterima"
    await itemCard.locator('button:has-text("Tandai diterima")').click();

    // Fill label code
    const labelCode = `INV-SRV-${Date.now()}`;
    await itemCard.locator('input[placeholder="Contoh: INV-2026-001"]').fill(labelCode);

    // Upload mock QR image
    await itemCard.locator('input[type="file"]').setInputFiles({
      name: 'mock_qr.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      ),
    });

    // Wait for FileReader to asynchronously load the image data into state
    await page.waitForTimeout(1000);

    // Click Simpan
    await itemCard.locator('button:has-text("Simpan")').click();

    // Verify item shows received status (DITERIMA)
    await expect(page.locator('text="DITERIMA"')).toBeVisible();

    // Complete the receiving process by clicking the Selesaikan button
    const selesaikanBtn = page.locator('button:has-text("Selesaikan")');
    await expect(selesaikanBtn).toBeVisible();
    await selesaikanBtn.click();

    // Verify BAST PDF button is now visible after reopening the completed draft
    const completedCard = page.locator(`.draft-card:has-text("${draftTitle}")`);
    await expect(completedCard).toBeVisible();
    await completedCard.click();

    const pdfBtn = page.locator('a:has-text("Cetak BAST (PDF)")');
    await expect(pdfBtn).toBeVisible();

    // Assert href is correct
    const href = await pdfBtn.getAttribute('href');
    expect(href).toContain('/api/procurement/drafts/');
    expect(href).toContain('/pdf');
  });
});
