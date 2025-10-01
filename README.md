# Dota 2 Draft Analyzer

AI-powered Dota 2 hero draft suggestions and counter-picking tool built with Next.js 15, TanStack Query, and Shadcn UI.

## 🚀 Features

- **Real-time Draft Analysis**: Get AI-powered hero suggestions based on enemy picks
- **Counter-pick Intelligence**: Advanced matchup analysis using OpenDota API data
- **Role-based Filtering**: Filter suggestions by hero roles (Carry, Support, etc.)
- **Meta-aware Suggestions**: Incorporates current patch win rates and pick rates
- **Intuitive UI**: Modern, responsive interface built with Shadcn UI

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: TanStack Query
- **Data Source**: OpenDota API
- **Icons**: Lucide React

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Environment Setup

Create a `.env.local` file:

```env
# OpenDota API Configuration
OPENDOTA_API_BASE=https://api.opendota.com/api
OPENDOTA_RATE_LIMIT=60
OPENDOTA_TIMEOUT=10000

# Cache Configuration
CACHE_TTL_HEROES=3600000
CACHE_TTL_STATS=1800000
CACHE_TTL_SUGGESTIONS=300000
```

## 🏗️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── heroes/        # Heroes endpoint
│   │   ├── hero-stats/    # Hero statistics
│   │   └── suggestions/   # Draft suggestions
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── draft/            # Draft-specific components
│   │   ├── DraftBoard.tsx    # Main draft interface
│   │   ├── HeroGrid.tsx      # Hero selection grid
│   │   ├── SuggestionPanel.tsx # AI suggestions
│   │   └── TeamDraft.tsx     # Team composition
│   ├── ui/               # Shadcn UI components
│   └── providers.tsx     # React Query provider
├── hooks/                # Custom React hooks
│   └── useDraft.ts       # Draft state management
├── lib/                  # Utility libraries
│   ├── types.ts          # TypeScript interfaces
│   ├── opendota.ts       # OpenDota API client
│   ├── draft-logic.ts    # Draft analysis algorithm
│   ├── data-transformer.ts # Data transformation utilities
│   ├── cache.ts          # Caching system
│   ├── validation.ts     # Input validation
│   └── error-handling.ts # Error handling utilities
└── public/               # Static assets
```

## 🎯 How It Works

1. **Enemy Team Input**: Select enemy heroes from the hero grid
2. **AI Analysis**: Algorithm analyzes matchups, meta trends, and team synergy
3. **Smart Suggestions**: Get ranked hero recommendations with reasoning
4. **Team Building**: Build your team composition with guided suggestions

## 📊 Algorithm Details

The suggestion system uses a weighted scoring model:

- **Counter Score (40%)**: Win rate vs enemy heroes
- **Team Synergy (30%)**: Compatibility with your picks
- **Meta Score (20%)**: Current patch performance
- **Pro Scene (10%)**: Professional match popularity

## 🚧 Development Status

### ✅ Completed

- Core draft analysis engine
- Hero selection interface
- Suggestion panel with filtering
- API integration with OpenDota
- Responsive UI design

### 🔄 In Progress

- Error boundaries and improved error handling
- Comprehensive input validation
- Performance optimizations
- Caching layer improvements

### 📋 Planned

- Unit and integration tests
- Historical draft analysis
- Pro scene integration
- Accessibility improvements
- Performance monitoring

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📈 Performance Considerations

- API response caching with TTL
- Component memoization for expensive renders
- Lazy loading for hero images
- Request debouncing for search

## 🔒 Security

- Input validation and sanitization
- Rate limiting protection
- Error message sanitization
- Type-safe API contracts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenDota](https://www.opendota.com/) for providing free Dota 2 API
- [Shadcn/ui](https://ui.shadcn.com/) for the component library
- [Valve](https://www.valvesoftware.com/) for Dota 2
