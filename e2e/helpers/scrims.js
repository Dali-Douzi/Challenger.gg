import { expect } from '@playwright/test';

/**
 * Post a scrim
 */
export async function postScrim(page, { format = '5v5', scheduledTime = null, notes = 'Looking for scrim' }) {
  await page.goto('/scrims');
  await page.waitForTimeout(1500);

  // Find all combo boxes on the page
  const allComboboxes = page.locator('[role="combobox"]');
  const totalComboboxes = await allComboboxes.count();
  console.log(`Total comboboxes found: ${totalComboboxes}`);

  // The first 4 comboboxes should be in the "Post a Scrim" section:
  // 0: Team (already selected)
  // 1: Format
  // 2: Day
  // 3: Time

  // Select Format (index 1)
  await allComboboxes.nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').first().click();
  await page.waitForTimeout(300);

  // Select Day (index 2)
  await allComboboxes.nth(2).click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').first().click();
  await page.waitForTimeout(300);

  // Select Time (index 3)
  await allComboboxes.nth(3).click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').first().click();
  await page.waitForTimeout(300);

  // Submit form - find the "Post Scrim" button (should be the first one)
  await page.locator('button:has-text("Post Scrim")').first().click();

  // Wait for success
  await page.waitForTimeout(2000);

  return { format, scheduledTime, notes };
}

/**
 * Request to join a scrim
 */
export async function requestScrim(page, scrimIndex = 0) {
  await page.goto('/scrims');
  await page.waitForTimeout(2000);

  // Get all comboboxes - the filter section starts after the posting section (first 4 comboboxes)
  const allComboboxes = page.locator('[role="combobox"]');
  const totalComboboxes = await allComboboxes.count();
  console.log(`Total comboboxes for filtering: ${totalComboboxes}`);

  // Combobox indices for filters section:
  // Post section: 0-3 (Team, Format, Day, Time)
  // Filter section: 4-7 (Game, Server, Rank, Request Team)

  // Always try to change the game filter to Valorant since that's what we posted
  console.log('Adjusting game filter to Valorant');

  // Click the Game filter dropdown (index 4)
  if (totalComboboxes > 4) {
    await allComboboxes.nth(4).click();
    await page.waitForTimeout(500);

    // List all available options
    const options = page.locator('[role="option"]');
    const optionCount = await options.count();
    console.log(`Found ${optionCount} game options`);

    for (let i = 0; i < optionCount; i++) {
      const text = await options.nth(i).textContent();
      console.log(`Option ${i}: ${text}`);
    }

    // Select "Valorant" from the dropdown
    const valorantOption = page.locator('[role="option"]:has-text("Valorant")');
    if (await valorantOption.count() > 0) {
      await valorantOption.click();
      console.log('Selected Valorant filter');
      await page.waitForTimeout(2000);
    } else {
      console.log('Valorant option not found, trying first option');
      await options.first().click();
      await page.waitForTimeout(2000);
    }
  }

  // Wait for scrims to load
  await page.waitForSelector('button:has-text("Request"), button:has-text("Join")', { timeout: 10000 });

  // Click request button on the first available scrim
  const requestButtons = page.locator('button:has-text("Request"), button:has-text("Join")');
  await requestButtons.nth(scrimIndex).click();

  // Wait for request to complete
  await page.waitForTimeout(2000);
}

/**
 * Accept a scrim request
 */
export async function acceptScrimRequest(page, requestIndex = 0) {
  await page.goto('/scrims');
  await page.waitForTimeout(2000);

  // Get all comboboxes and adjust game filter to Valorant
  const allComboboxes = page.locator('[role="combobox"]');
  const totalComboboxes = await allComboboxes.count();
  console.log(`Total comboboxes: ${totalComboboxes}`);

  // Adjust game filter to Valorant (index 4 in filter section)
  if (totalComboboxes > 4) {
    console.log('Adjusting game filter to Valorant');
    await allComboboxes.nth(4).click();
    await page.waitForTimeout(500);

    // Select Valorant from dropdown
    const valorantOption = page.locator('[role="option"]:has-text("Valorant")');
    if (await valorantOption.count() > 0) {
      await valorantOption.click();
      console.log('Selected Valorant filter');
      await page.waitForTimeout(2000);
    }
  }

  // Look for Accept button on the page (should be on scrim cards with pending requests)
  const acceptButtons = page.locator('button:has-text("Accept")');
  const acceptCount = await acceptButtons.count();
  console.log(`Found ${acceptCount} accept button(s) on scrims page`);

  if (acceptCount > requestIndex) {
    await acceptButtons.nth(requestIndex).click();
    console.log('Clicked accept button');
    await page.waitForTimeout(2000);
  } else {
    throw new Error(`No accept button found at index ${requestIndex}. Found ${acceptCount} total accept buttons.`);
  }
}

/**
 * Decline a scrim request
 */
export async function declineScrimRequest(page, requestIndex = 0) {
  await page.goto('/scrims');

  // Navigate to pending requests or my scrims
  const myScrimsTab = page.locator('button:has-text("My Scrims"), a:has-text("My Scrims")');
  if (await myScrimsTab.count() > 0) {
    await myScrimsTab.click();
    await page.waitForTimeout(1000);
  }

  // Click decline button on the first pending request
  const declineButtons = page.locator('button:has-text("Decline"), button:has-text("Reject")');
  await declineButtons.nth(requestIndex).click();

  // Wait for decline to complete
  await page.waitForTimeout(2000);
}

/**
 * Check if scrim exists on the page
 */
export async function scrimExists(page, format) {
  await page.goto('/scrims');

  const scrimCard = page.locator(`[data-testid="scrim-card"]:has-text("${format}"), .scrim-card:has-text("${format}")`);
  return await scrimCard.count() > 0;
}

/**
 * Open chat for a scrim
 */
export async function openScrimChat(page, scrimIndex = 0) {
  // Wait for scrims page to load
  await page.goto('/scrims');
  await page.waitForTimeout(1500);

  // Look for the "Chat" or message button on scrim cards
  // These buttons appear after a scrim request is made
  const chatButtons = page.locator('button:has([data-testid="MessageIcon"]), button:has-text("Chat")');

  const buttonCount = await chatButtons.count();
  console.log(`Found ${buttonCount} chat buttons on page`);

  if (buttonCount > scrimIndex) {
    await chatButtons.nth(scrimIndex).click();
    await page.waitForTimeout(2000);

    // Check if chat window appeared but is minimized
    // Look for maximize button which indicates the chat is minimized
    const maximizeButton = page.locator('button:has([data-testid="MaximizeIcon"])').first();
    if (await maximizeButton.count() > 0) {
      console.log('Chat is minimized, expanding it');
      await maximizeButton.click();
      await page.waitForTimeout(1000);
    }

    return true;
  }

  return false;
}

/**
 * Send a chat message
 */
export async function sendChatMessage(page, message) {
  // Wait for chat window to be visible
  await page.waitForTimeout(1000);

  // Find chat input field with updated selectors for the new chat UI
  const chatInput = page.locator('input[placeholder*="Type a message" i], input[placeholder*="message" i], textarea[placeholder*="message" i], .message-input input').first();

  // Wait for input to be visible
  await chatInput.waitFor({ state: 'visible', timeout: 5000 });

  await chatInput.fill(message);
  await page.waitForTimeout(500);

  // Find and click send button - look for icon button or submit button
  const sendButton = page.locator('button[aria-label*="Send" i], button:has([data-testid="SendIcon"]), button[type="submit"]').last();
  await sendButton.click();

  // Wait for message to be sent
  await page.waitForTimeout(1500);
}

/**
 * Verify chat message is visible
 */
export async function verifyChatMessage(page, message) {
  // Look for message in chat bubbles or message list
  const messageElement = page.locator(`.message-bubble:has-text("${message}"), .chat-message:has-text("${message}"), [class*="Message"]:has-text("${message}")`).first();

  // If specific selectors don't work, fall back to general text search
  if (await messageElement.count() === 0) {
    const fallbackElement = page.locator(`text="${message}"`).first();
    await expect(fallbackElement).toBeVisible({ timeout: 5000 });
  } else {
    await expect(messageElement).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Check if chat is accessible/visible
 */
export async function isChatVisible(page) {
  // Wait a bit for chat to fully render
  await page.waitForTimeout(1000);

  // Check for message input as the most reliable indicator
  const chatInput = page.locator('input[placeholder*="Type a message" i], input[placeholder*="message" i], textarea[placeholder*="message" i]').first();

  if (await chatInput.count() > 0) {
    try {
      await chatInput.waitFor({ state: 'visible', timeout: 3000 });
      console.log('Chat input found and visible');
      return true;
    } catch (e) {
      console.log('Chat input found but not visible');
    }
  }

  // Check for chat window with team names (e.g., "Team1 vs Team2")
  const chatWindowWithVs = page.locator('[class*="MuiPaper"]:has-text("vs")').first();
  if (await chatWindowWithVs.count() > 0) {
    const isVisible = await chatWindowWithVs.isVisible();
    console.log(`Chat window with 'vs' found, visible: ${isVisible}`);
    if (isVisible) return true;
  }

  // Check for minimize/maximize icon buttons (present in chat header)
  const chatIcons = page.locator('button:has([data-testid="MinimizeIcon"]), button:has([data-testid="MaximizeIcon"])').first();
  if (await chatIcons.count() > 0) {
    const isVisible = await chatIcons.isVisible();
    console.log(`Chat control icons found, visible: ${isVisible}`);
    return isVisible;
  }

  console.log('No chat elements found');
  return false;
}

/**
 * Close the chat window
 */
export async function closeChatWindow(page) {
  // Look for close button (X icon)
  const closeButton = page.locator('button[aria-label*="Close" i], button:has([data-testid="CloseIcon"]), .chat-close').first();

  if (await closeButton.count() > 0) {
    await closeButton.click();
    await page.waitForTimeout(500);
    return true;
  }

  // Alternative: minimize button
  const minimizeButton = page.locator('button[aria-label*="Minimize" i], button:has([data-testid="MinimizeIcon"])').first();
  if (await minimizeButton.count() > 0) {
    await minimizeButton.click();
    await page.waitForTimeout(500);
    return true;
  }

  return false;
}
