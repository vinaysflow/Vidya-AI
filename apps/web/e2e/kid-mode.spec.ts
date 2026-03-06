import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Zustand localStorage seed — must match the exact `partialize` shape
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'vidya-chat-storage';
const KID_MODE_SEED = {
  state: {
    language: 'EN',
    subject: 'MATHEMATICS',
    apiKey: null,
    userId: null,
    grade: 3,
    effectiveGrade: null,
    sessionHistory: [],
    hasCompletedOnboarding: true,
    onboardingStep: 0,
    learningGoal: '',
    difficultyLevel: 'BEGINNER',
    learnerState: null,
    noFinalAnswerMode: false,
    planTier: 'FREE',
    theme: 'SYSTEM',
    voiceEnabled: false,
    gamification: null,
    rsmTrack: null,
    kidModeEnabled: true,
    activeQuest: null,
  },
  version: 1,
};

// ---------------------------------------------------------------------------
// Mock API response factories
// ---------------------------------------------------------------------------
const SESSION_ID = 'test-session-001';

function mockSessionStartResponse() {
  return {
    success: true,
    session: { id: SESSION_ID, subject: 'MATHEMATICS', language: 'EN' },
    messages: [
      {
        id: 'msg-user-001',
        role: 'user',
        content: 'You want to build an elevator in Minecraft that goes up 5 floors. Each floor is 4 blocks tall. How many blocks tall is the whole elevator?',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'msg-assistant-001',
        role: 'assistant',
        content:
          "Great question! Let's think about this step by step. If each floor is 4 blocks tall, and there are 5 floors, how could we figure out the total?\n\n[A] Add 4 + 5 = 9 blocks\n[B] Multiply 4 × 5 = 20 blocks\n[C] Count each floor one by one: 4, 8, 12, 16, 20",
        metadata: {
          questionType: 'attempt_prompt',
          hintLevel: 0,
          topic: 'multiplication',
          conceptsIdentified: ['multiplication_intro'],
          distanceFromSolution: 80,
          readiness: 20,
          grounding: 'bank',
          confidence: 0.9,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

let messageCallCount = 0;

function mockMessageResponse(userContent?: string) {
  messageCallCount++;
  const isWrongChoice = userContent?.includes('Add 4 + 5') ?? false;
  const isQuickAction = ['I\'m stuck', 'Help me!', 'Say it differently'].some((q) => userContent?.includes(q));

  if (messageCallCount === 1) {
    if (isWrongChoice) {
      return {
        success: true,
        message: {
          id: 'msg-assistant-002',
          role: 'assistant',
          content:
            "Hmm, let's try again! Think about what we do when we have groups of the same size.\n\n[A] Add the numbers together\n[B] Multiply groups × size\n[C] Subtract",
          metadata: {
            questionType: 'hint_with_question',
            hintLevel: 1,
            topic: 'multiplication',
            conceptsIdentified: ['multiplication_intro'],
            distanceFromSolution: 60,
            readiness: 40,
            grounding: 'bank',
            confidence: 0.8,
          },
          timestamp: new Date().toISOString(),
        },
        gamification: { xpEarned: 0, leveledUp: false },
      };
    }
    if (isQuickAction) {
      return {
        success: true,
        message: {
          id: 'msg-assistant-002',
          role: 'assistant',
          content:
            "No problem! Think of it like stacks of blocks. If you have 5 stacks and each has 4 blocks, how many total?\n\n[A] 5 + 4 blocks\n[B] 5 × 4 = 20 blocks\n[C] Count by 4s: 4, 8, 12, 16, 20",
          metadata: {
            questionType: 'hint_with_question',
            hintLevel: 1,
            topic: 'multiplication',
            conceptsIdentified: ['multiplication_intro'],
            distanceFromSolution: 50,
            readiness: 50,
            grounding: 'bank',
            confidence: 0.85,
          },
          timestamp: new Date().toISOString(),
        },
        gamification: { xpEarned: 0, leveledUp: false },
      };
    }
    return {
      success: true,
      message: {
        id: 'msg-assistant-002',
        role: 'assistant',
        content:
          "Nice! You figured out the length — it's 20 blocks! Vidya's robot friend is confused — can you teach him WHY that works?\n\n[A] Because 5 floors × 4 blocks = 20\n[B] Because I counted each block\n[C] I just guessed!",
        metadata: {
          questionType: 'celebrate_then_explain_back',
          hintLevel: 0,
          topic: 'multiplication',
          conceptsIdentified: ['multiplication_intro'],
          distanceFromSolution: 10,
          readiness: 80,
          grounding: 'bank',
          confidence: 0.95,
        },
        timestamp: new Date().toISOString(),
      },
      gamification: { xpEarned: 15, leveledUp: false },
    };
  }
  return {
    success: true,
    message: {
      id: `msg-assistant-${messageCallCount + 1}`,
      role: 'assistant',
      content: 'Excellent explanation! You really understand multiplication now!',
      metadata: {
        questionType: 'celebration',
        hintLevel: 0,
        topic: 'multiplication',
        conceptsIdentified: ['multiplication_intro'],
        distanceFromSolution: 0,
        readiness: 100,
        grounding: 'bank',
        confidence: 1.0,
      },
      timestamp: new Date().toISOString(),
    },
    gamification: { xpEarned: 25, leveledUp: false },
  };
}

function mockEndSessionResponse() {
  return {
    success: true,
    session: {
      id: SESSION_ID,
      status: 'COMPLETED',
      endedAt: new Date().toISOString(),
      resolved: true,
      masteryGain: 0.7,
      conceptsUsed: ['multiplication_intro'],
    },
    report: {
      summary: 'Great session on multiplication! You figured out how to multiply floors by block height.',
      conceptsEngaged: ['Multiplication', 'Repeated Addition'],
      strengths: ['Good at skip counting', 'Understands grouping'],
      areasForImprovement: ['Practice with larger numbers'],
      nextSteps: ['Try the LEGO Rows quest next'],
      messagesExchanged: 4,
      durationMinutes: 5,
      readinessStart: 20,
      readinessEnd: 100,
    },
    gamification: { xpEarned: 50, leveledUp: false, streak: 1, newBadges: [] },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function seedKidMode(context: BrowserContext) {
  await context.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, data: KID_MODE_SEED },
  );
}

async function installApiMocks(page: Page) {
  messageCallCount = 0;

  await page.route('**/api/tutor/session/start', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSessionStartResponse()),
    }),
  );

  await page.route('**/api/tutor/message', async (route) => {
    let userContent = '';
    try {
      const data = (await route.request().postDataJSON()) as { message?: string };
      userContent = typeof data?.message === 'string' ? data.message : '';
    } catch {
      // ignore
    }
    const response = mockMessageResponse(userContent);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  await page.route('**/api/game/scene-image', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, imageUrl: null }),
    }),
  );

  await page.route('**/api/tutor/session/*/end', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEndSessionResponse()),
    }),
  );

  await page.route('**/api/users/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  );

  await page.route('**/api/mastery/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, mastery: [] }),
    }),
  );

  await page.route('**/api/gamification/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        xp: 55,
        level: 1,
        nextLevelXp: 100,
        currentStreak: 1,
        streakFreezes: 0,
        badges: [],
      }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('Kid Mode — Game-First Quest Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    await seedKidMode(context);
    await installApiMocks(page);
  });

  test('welcome screen renders quest cards and chapter headers', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Pick an adventure')).toBeVisible();

    const chapterHeaders = page.locator('[data-testid="chapter-header"]');
    await expect(chapterHeaders.first()).toBeVisible();
    await expect(chapterHeaders.first()).toContainText('Minecraft Builder');

    const questCards = page.locator('[data-testid^="quest-card-"]');
    await expect(questCards.first()).toBeVisible();
    const count = await questCards.count();
    expect(count).toBeGreaterThan(0);

    await expect(page.locator('[data-testid="quest-card-minecraft_elevator"]')).toBeVisible();
    await expect(page.locator('[data-testid="quest-card-minecraft_elevator"]')).toContainText(
      'Build a Minecraft Elevator',
    );

    // Visual regression: quest picker layout
    await expect(page).toHaveScreenshot('01-quest-picker.png');
  });

  test('clicking a quest starts session and shows GameScene', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();

    const gameScene = page.locator('[data-testid="game-scene"]');
    await expect(gameScene).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('[data-testid="vidya-bubble"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-adventure"]')).toBeVisible();

    // Visual regression: initial game scene with quest prompt visible
    await expect(page).toHaveScreenshot('02-game-scene-initial.png');
  });

  test('choice buttons render from [A]/[B]/[C] in assistant message', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();

    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    const bubble = page.locator('[data-testid="vidya-bubble"]');
    await expect(bubble).toBeVisible();

    const choiceA = page.locator('[data-testid="choice-A"]');
    const choiceB = page.locator('[data-testid="choice-B"]');
    const choiceC = page.locator('[data-testid="choice-C"]');
    await expect(choiceA).toBeVisible();
    await expect(choiceB).toBeVisible();
    await expect(choiceC).toBeVisible();

    await expect(choiceA).toContainText('Add 4 + 5 = 9 blocks');
    await expect(choiceB).toContainText('Multiply 4 × 5 = 20 blocks');

    const quickActions = page.locator('[data-testid="quick-action"]');
    await expect(quickActions.first()).toBeVisible();
    await expect(quickActions).toHaveCount(3);
  });

  test('clicking a choice sends message and shows new content', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="choice-B"]').click();

    const bubble = page.locator('[data-testid="vidya-bubble"]');
    await expect(bubble).toContainText('robot friend is confused', { timeout: 10_000 });

    // Visual regression: after correct answer, celebrate_then_explain_back state
    await expect(page).toHaveScreenshot('03-after-correct-answer.png');
  });

  test('explain-back shows WHY choices and header', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    // Pick correct answer -> triggers celebrate_then_explain_back
    await page.locator('[data-testid="choice-B"]').click();

    // Speech bubble should show explain-back header
    const bubble = page.locator('[data-testid="vidya-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    await expect(bubble).toContainText('robot friend is confused');

    // WHY choices should be present
    await expect(page.locator('[data-testid="choice-A"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="choice-A"]')).toContainText('Because 5 floors');

    // Quick actions still present (below choices)
    await expect(page.locator('[data-testid="quick-action"]').first()).toBeVisible();
  });

  test('end adventure triggers report with Amazing job', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="end-adventure"]').click();

    const report = page.locator('[data-testid="kid-report"]');
    await expect(report).toBeVisible({ timeout: 10_000 });
    await expect(report).toContainText('Amazing job!');

    await expect(report).toContainText('Multiplication');
    await expect(report).toContainText('Repeated Addition');

    await expect(page.locator('[data-testid="next-adventure"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-adventure"]')).toContainText('Next Adventure!');

    // Visual regression: kid end-of-session report card
    await expect(page).toHaveScreenshot('05-kid-report.png');
  });

  test('Next Adventure resets to WelcomeScreen', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="end-adventure"]').click();
    await expect(page.locator('[data-testid="kid-report"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="next-adventure"]').click();

    await expect(page.getByText('Pick an adventure')).toBeVisible({ timeout: 10_000 });

    const questCards = page.locator('[data-testid^="quest-card-"]');
    await expect(questCards.first()).toBeVisible();

    await expect(page.locator('[data-testid="game-scene"]')).not.toBeVisible();
  });

  test('quest complete shows victory screen with Next Adventure', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    // Pick correct answer → celebrate_then_explain_back
    await page.locator('[data-testid="choice-B"]').click();
    await expect(page.locator('[data-testid="vidya-bubble"]')).toBeVisible({ timeout: 10_000 });

    // Pick explain-back answer → celebration (quest complete)
    await page.locator('[data-testid="choice-A"]').click();

    // Victory screen should show inside game-scene
    await expect(page.getByText('Quest Complete!')).toBeVisible({ timeout: 10_000 });
    const nextBtn = page.locator('[data-testid="next-adventure"]');
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toContainText('Next Adventure!');

    // Visual regression: victory screen (confetti + trophy)
    await expect(page).toHaveScreenshot('04-victory-screen.png');

    // Click Next Adventure → back to quest picker
    await nextBtn.click();
    await expect(page.getByText('Pick an adventure')).toBeVisible({ timeout: 10_000 });
  });

  test('wrong choice shows hint and new choices', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="choice-A"]').click();

    const bubble = page.locator('[data-testid="vidya-bubble"]');
    // After wrong answer, bubble shows a hint (any sentence from the response)
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    await expect(bubble).not.toContainText("Let's think about this");

    await expect(page.locator('[data-testid="choice-A"]')).toContainText('Add the numbers');
    await expect(page.locator('[data-testid="choice-B"]')).toContainText('Multiply groups');
  });

  test('quick action I\'m stuck returns hint with new choices', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="quick-action"]').filter({ hasText: "I'm stuck" }).click();

    const bubble = page.locator('[data-testid="vidya-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    // Hint choices should appear: choice-B has the correct answer
    await expect(page.locator('[data-testid="choice-B"]')).toContainText('5 × 4 = 20 blocks', { timeout: 10_000 });
  });

  test('quest progress ring is visible', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    const progress = page.locator('[data-testid="quest-progress"]');
    await expect(progress).toBeVisible();
    // Progress is shown as an SVG ring, not dots
    await expect(progress.locator('svg')).toBeVisible();
  });

  test('SceneCanvas SVG renders inside game-scene', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    // SceneCanvas renders as an SVG element
    const svg = page.locator('[data-testid="game-scene"] svg').first();
    await expect(svg).toBeVisible({ timeout: 5_000 });
    // SVG has a viewBox (confirms it's SceneCanvas, not some other SVG)
    const viewBox = await svg.getAttribute('viewBox');
    expect(viewBox).toBeTruthy();
  });

  test('no whiteboard / equation steps in kid mode', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    // Whiteboard container should NOT exist in kid mode game scene
    await expect(page.locator('[data-testid="whiteboard-container"]')).not.toBeVisible();
  });

  test('fallback choices appear when LLM omits [A]/[B]/[C]', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="quest-card-minecraft_elevator"]').click();
    await expect(page.locator('[data-testid="game-scene"]')).toBeVisible({ timeout: 10_000 });

    // Override the message endpoint to return a response WITHOUT choices
    await page.route('**/api/tutor/message', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: {
            id: 'msg-no-choices',
            role: 'assistant',
            content:
              "Great job! Can you teach Vidya's robot WHY multiplying the number of blocks by the length gives the total?",
            metadata: {
              questionType: 'celebrate_then_explain_back',
              hintLevel: 0,
              topic: 'multiplication',
              conceptsIdentified: ['multiplication_intro'],
              distanceFromSolution: 10,
              readiness: 80,
              grounding: 'bank',
              confidence: 0.95,
            },
            timestamp: new Date().toISOString(),
          },
          gamification: { xpEarned: 15, leveledUp: false },
        }),
      });
    });

    // Click a choice to trigger the overridden endpoint
    await page.locator('[data-testid="choice-B"]').click();

    // Wait for the response to render
    const bubble = page.locator('[data-testid="vidya-bubble"]');
    await expect(bubble).toBeVisible({ timeout: 10_000 });

    // Fallback choice buttons MUST appear even though the LLM omitted [A]/[B]/[C]
    const choiceA = page.locator('[data-testid="choice-A"]');
    const choiceB = page.locator('[data-testid="choice-B"]');
    const choiceC = page.locator('[data-testid="choice-C"]');
    await expect(choiceA).toBeVisible({ timeout: 5_000 });
    await expect(choiceB).toBeVisible();
    await expect(choiceC).toBeVisible();

    // Fallback choices for celebrate_then_explain_back should be explanation-oriented
    await expect(choiceA).toContainText('multiplied');
    await expect(choiceB).toContainText('added');
    await expect(choiceC).toContainText('not sure');
  });
});

// ---------------------------------------------------------------------------
// Role Selector Tests
// ---------------------------------------------------------------------------
test.describe('Role Selector', () => {
  async function seedUnset(page: Page) {
    await page.goto('/');
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      {
        key: STORAGE_KEY,
        value: {
          state: {
            language: 'EN',
            subject: 'MATHEMATICS',
            apiKey: null,
            userId: null,
            grade: null,
            effectiveGrade: null,
            sessionHistory: [],
            hasCompletedOnboarding: true,
            onboardingStep: 0,
            learningGoal: '',
            difficultyLevel: 'BEGINNER',
            learnerState: null,
            noFinalAnswerMode: false,
            planTier: 'FREE',
            theme: 'SYSTEM',
            voiceEnabled: false,
            gamification: null,
            rsmTrack: null,
            kidModeEnabled: null,
          },
          version: 1,
        },
      }
    );
    await page.reload();
  }

  test('role selector renders when kidModeEnabled is null', async ({ page }) => {
    await seedUnset(page);
    await expect(page.locator('[data-testid="role-selector"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="role-kid-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-start-learning"]')).toBeVisible();
  });

  test('kid mode card leads to parent setup', async ({ page }) => {
    await seedUnset(page);
    await page.locator('[data-testid="role-kid-mode"]').click();
    await expect(page.locator('[data-testid="role-selector"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="parent-setup"]')).toBeVisible({ timeout: 5_000 });
  });

  test('start learning card skips to adult welcome screen', async ({ page }) => {
    await seedUnset(page);
    // Seed hasCompletedOnboarding true so we skip the onboarding wizard
    await page.locator('[data-testid="role-start-learning"]').click();
    await expect(page.locator('[data-testid="role-selector"]')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Parent Setup Tests
// ---------------------------------------------------------------------------
test.describe('Parent Setup', () => {
  async function seedKidNoGrade(page: Page) {
    await page.goto('/');
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      {
        key: STORAGE_KEY,
        value: {
          state: {
            language: 'EN',
            subject: 'MATHEMATICS',
            apiKey: null,
            userId: null,
            grade: null,
            effectiveGrade: null,
            sessionHistory: [],
            hasCompletedOnboarding: true,
            onboardingStep: 0,
            learningGoal: '',
            difficultyLevel: 'BEGINNER',
            learnerState: null,
            noFinalAnswerMode: false,
            planTier: 'FREE',
            theme: 'SYSTEM',
            voiceEnabled: false,
            gamification: null,
            rsmTrack: null,
            kidModeEnabled: true,
          },
          version: 1,
        },
      }
    );
    await page.reload();
  }

  test('parent setup renders when kid mode but no grade', async ({ page }) => {
    await seedKidNoGrade(page);
    await expect(page.locator('[data-testid="parent-setup"]')).toBeVisible({ timeout: 5_000 });
    // All 5 grade buttons visible
    for (const g of [3, 4, 5, 6, 7]) {
      await expect(page.locator(`[data-testid="grade-btn-${g}"]`)).toBeVisible();
    }
    // Compliance block visible
    await expect(page.locator('[data-testid="compliance-block"]')).toBeVisible();
    // Lets go button present and initially disabled
    await expect(page.locator('[data-testid="parent-lets-go"]')).toBeVisible();
    await expect(page.locator('[data-testid="parent-lets-go"]')).toBeDisabled();
  });

  test('selecting a grade enables Lets go and navigates to quest picker', async ({ page }) => {
    await seedKidNoGrade(page);
    await page.locator('[data-testid="grade-btn-3"]').click();
    // Lets go should now be enabled
    await expect(page.locator('[data-testid="parent-lets-go"]')).toBeEnabled();
    await page.locator('[data-testid="parent-lets-go"]').click();
    // Parent setup gone; quest picker appears
    await expect(page.locator('[data-testid="parent-setup"]')).not.toBeVisible();
    await expect(page.getByText('Pick an adventure')).toBeVisible({ timeout: 5_000 });
  });

  test('RSM toggle sets rsmTrack and parent settings button returns to setup', async ({ page }) => {
    // Seed with grade 3 set so we start at WelcomeScreen
    await page.goto('/');
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      {
        key: STORAGE_KEY,
        value: {
          state: {
            language: 'EN',
            subject: 'MATHEMATICS',
            apiKey: null,
            userId: null,
            grade: 3,
            effectiveGrade: null,
            sessionHistory: [],
            hasCompletedOnboarding: true,
            onboardingStep: 0,
            learningGoal: '',
            difficultyLevel: 'BEGINNER',
            learnerState: null,
            noFinalAnswerMode: false,
            planTier: 'FREE',
            theme: 'SYSTEM',
            voiceEnabled: false,
            gamification: null,
            rsmTrack: null,
            kidModeEnabled: true,
          },
          version: 1,
        },
      }
    );
    await page.reload();

    // Parent Settings button should take us back to parent setup
    const settingsBtn = page.locator('[data-testid="parent-settings-btn"]');
    await expect(settingsBtn).toBeVisible({ timeout: 5_000 });
    await settingsBtn.click();
    await expect(page.locator('[data-testid="parent-setup"]')).toBeVisible({ timeout: 5_000 });

    // RSM toggle is present and can be clicked
    const rsmToggle = page.locator('[data-testid="rsm-toggle"]');
    await expect(rsmToggle).toBeVisible();
    await rsmToggle.check();
    await expect(rsmToggle).toBeChecked();
  });
});
