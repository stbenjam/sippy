import { expect, test } from '@playwright/test'

test.describe('Component Readiness v2', () => {
  test('placeholder page loads', async ({ page }) => {
    await page.goto('/component_readiness/v2/')
    await expect(page.getByText('Component Readiness v2')).toBeVisible()
  })
})
