# Vidya (विद्या / ವಿದ್ಯಾ) - Socratic AI Tutor

> Learn by Discovery. Never Get Direct Answers.

A pedagogically-grounded AI tutor that uses Socratic questioning to help students learn across Science, Coding, Economics, Literature, and more. Supports **7 languages** including English, Hindi, Kannada, French, German, Spanish, and Chinese.

![Vidya Banner](https://via.placeholder.com/800x200/3b82f6/ffffff?text=Vidya+-+Socratic+AI+Tutor)

## 🎯 Core Philosophy

Unlike answer-delivery systems (Chegg, ChatGPT direct usage), Vidya:

- ❌ **Never gives direct answers** to academic problems
- ✅ **Guides through Socratic questioning** - asks probing questions to help students discover answers themselves
- ✅ **Requires student attempts first** before providing any scaffolding
- ✅ **Tracks reasoning patterns** to identify conceptual gaps
- ✅ **Celebrates productive struggle** as part of learning

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (LTS recommended)
- **pnpm 8+** (package manager)
- **PostgreSQL 15+** (database)
- **Redis 7+** (optional, for caching)
- **Claude API Key** from [Anthropic](https://console.anthropic.com/)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/vidya.git
cd vidya

# Install dependencies
pnpm install
```

### 2. Set Up Environment

```bash
# Copy environment example
cp apps/api/.env.example apps/api/.env

# Edit with your credentials
nano apps/api/.env
```

**Required environment variables:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vidya"
ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

### 3. Initialize Database

```bash
# Push schema to database
pnpm db:push

# (Optional) Seed with sample data
pnpm db:seed
```

### 4. Start Development

```bash
# Start all services (API + Web)
pnpm dev
```

This will start:
- 🖥️ **Web App**: http://localhost:3000
- 🔌 **API Server**: http://localhost:4000
- 📊 **Prisma Studio**: http://localhost:5555 (run `pnpm db:studio` separately)

## 📁 Project Structure

```
vidya/
├── apps/
│   ├── web/                    # React frontend (Vite + TypeScript)
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── locales/        # i18n translations (EN, HI, KN)
│   │   │   └── lib/            # Utilities
│   │   └── ...
│   │
│   └── api/                    # Express.js backend
│       ├── src/
│       │   ├── routes/         # API endpoints
│       │   ├── services/
│       │   │   └── socratic/   # 🧠 Socratic Engine (core logic)
│       │   │       ├── engine.ts
│       │   │       └── prompts/
│       │   └── ...
│       └── prisma/             # Database schema
│
├── packages/                   # Shared packages (future)
├── turbo.json                 # Turborepo config
└── package.json
```

## 🧠 How the Socratic Engine Works

```
Student asks question
        │
        ▼
┌─────────────────┐
│ Attempt Gate    │──► "What have you tried so far?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analyze Attempt │──► Identify concepts, gaps, errors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │──► Socratic question (NEVER the answer)
│ Response        │
└─────────────────┘
```

### Hint Ladder System

When students are stuck, help increases gradually:

| Level | Type of Help |
|-------|--------------|
| 1 | Ask what they've tried |
| 2 | Point to relevant concept area |
| 3 | Narrow down the concept |
| 4 | Give a similar, simpler example |
| 5 | Break into sub-questions |

**Never goes beyond Level 5.** Students must engage their own thinking.

## 🌍 Language Support

Vidya is built **vernacular-first** for the Indian market:

| Language | Code | Status |
|----------|------|--------|
| English | `EN` | ✅ Full support |
| Hindi (हिंदी) | `HI` | ✅ Full support |
| Kannada (ಕನ್ನಡ) | `KN` | ✅ Full support |

Technical terms (velocity, acceleration, etc.) are kept in English for familiarity, while explanations use natural conversational language.

## 📱 Features

### MVP (Current)
- [x] Socratic dialogue engine
- [x] Attempt-first gate
- [x] Progressive hint ladder
- [x] Trilingual support (EN/HI/KN)
- [x] Physics tutoring
- [x] Basic session persistence
- [x] PWA support (installable)

### Roadmap
- [ ] Chemistry & Math tutoring
- [ ] Voice input (speech-to-text)
- [ ] Image input (photo of textbook)
- [ ] Offline mode
- [ ] Progress analytics
- [ ] More languages (Tamil, Telugu, Marathi)

## 🛠️ Development

### Available Scripts

```bash
# Start development (all apps)
pnpm dev

# Start specific app
pnpm --filter @vidya/web dev
pnpm --filter @vidya/api dev

# Build for production
pnpm build

# Run tests
pnpm test

# Database operations
pnpm db:push      # Push schema changes
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed sample data

# Linting
pnpm lint
```

### Using with Cursor IDE

1. Open the `vidya` folder in Cursor
2. Install recommended extensions (ESLint, Prettier, Tailwind CSS IntelliSense)
3. Use Cursor AI to help with:
   - "Add a new subject to the Socratic engine"
   - "Create a component for showing progress"
   - "Add Tamil language support"

## 🔑 API Reference

### Start Session

```bash
POST /api/tutor/session/start
Content-Type: application/json

{
  "subject": "PHYSICS",
  "language": "HI",
  "problemText": "एक गेंद को 20 m/s के वेग से ऊपर फेंका गया। अधिकतम ऊंचाई ज्ञात करें।"
}
```

### Send Message

```bash
POST /api/tutor/message
Content-Type: application/json

{
  "sessionId": "clxyz...",
  "message": "मैंने v² = u² - 2gh का formula use किया",
  "language": "HI"
}
```

### Response Format

```json
{
  "success": true,
  "message": {
    "id": "msg_123",
    "role": "assistant",
    "content": "बहुत बढ़िया! आपने सही formula choose किया। अब सोचो - जब गेंद maximum height पर होगी, तो उस समय velocity क्या होगी?",
    "language": "HI",
    "metadata": {
      "questionType": "socratic",
      "hintLevel": 0,
      "distanceFromSolution": 35
    }
  }
}
```

## 💰 Cost Estimation

| Item | Monthly Cost |
|------|-------------|
| Claude API (with caching) | ~$50-100 |
| Railway (API hosting) | $0-5 |
| Vercel (Frontend) | $0 |
| PostgreSQL (Neon/Supabase) | $0 |
| **Total** | **$50-105** |

At ₹500/user/month with 100 users = ₹50,000 (~$600) → Healthy margin

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for curious learners everywhere.

**विद्या ददाति विनयम्** (Knowledge gives humility)
