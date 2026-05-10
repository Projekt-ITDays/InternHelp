# 🎓 InternHelp

An **AI-powered career guidance platform** built for AGH IT Days — helping students find their path in IT by generating personalized learning roadmaps, skill assessments, and career plans powered by an intelligent AI agent.

> Built in collaboration with a mentor from Google. 🚀

---

## ✨ What it does

InternHelp analyzes a student's skills, experience, and goals through a survey, then uses an AI agent to generate a fully personalized career roadmap — complete with learning resources, milestones, and XP-based gamification to keep them motivated.

### Core Features

- 🤖 **AI Career Agent** — LangChain-powered agent that analyzes user input and generates tailored roadmaps
- 🗺️ **Interactive Roadmap** — visual honeycomb-style roadmap with completable milestones and XP progression
- 📋 **Smart Survey** — collects skills, tools, and goals with tag-based input for cleaner AI processing
- 🏆 **Gamification** — XP system, levels, and rewards for completing learning tasks
- 📊 **Dashboard** — overview of all generated plans with detailed breakdowns
- 🌐 **Web Scraper** — custom scraper that feeds up-to-date resources into the AI knowledge base

---

## 🚀 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Angular | SPA framework |
| TypeScript | Language |
| CSS | Styling |

### Backend
| Technology | Purpose |
|---|---|
| NestJS | REST API framework |
| LangChain | AI Agent & LLM orchestration |
| LangGraph | Agent workflow management |
| MongoDB | Database |
| TypeScript | Language |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker / Docker Compose | Containerization |
| Git / GitHub Actions | Version control & CI |

---

## 🏗️ Monorepo Structure

```
InternHelp/
├── backend/          # NestJS API + AI Agent
│   ├── src/
│   │   ├── agent/    # LangChain AI Agent
│   │   ├── scraper/  # Web scraper for knowledge base
│   │   └── plans/    # Career plan generation
│   └── package.json
├── frontend/         # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Plans overview
│   │   │   ├── roadmap/         # Interactive roadmap component
│   │   │   └── survey/          # User skills survey
│   └── package.json
├── docker-compose.yml
├── features.md       # Planned UX improvements
└── tasks.md          # Team task tracker
```

---

## 🛠️ Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/)

### Run with Docker (recommended)

```bash
git clone https://github.com/Projekt-ITDays/InternHelp.git
cd InternHelp
docker-compose up --build
```

### Install dependencies (for local dev / VS Code IntelliSense)

```bash
cd backend && npm install
cd ../frontend && npm install
```

The app will be available at:
- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000`

---

## 🤖 AI Agent

The core of InternHelp is a **LangChain AI Agent** that:

1. Receives user data from the survey (skills, goals, experience level)
2. Queries the knowledge base built by the custom web scraper
3. Generates a structured career roadmap with milestones and resources
4. Returns personalized learning paths tailored to the student's profile

---

## 🗺️ Roadmap — Planned Features

- [ ] Interactive tag input for skills in the survey
- [ ] Delete / archive generated plans from dashboard
- [ ] Clickable resource URLs in roadmap steps
- [ ] XP animations and confetti on task completion
- [ ] Export career plan to PDF

---

## 👥 Team

Built by students of AGH University of Science and Technology as part of **IT Days** university fair project.

| Role | Person |
|---|---|
| Team Lead & Software Engineer | [Bartosz Brańka](https://github.com/Dyzio9666) |
| DevOps | Adam Batko |
| Software Engineer | Mikołaj Buczyński |
| Software Engineer | Krzysztof Chowaniec |

---

## 📄 Docs

- [features.md](./features.md) — planned UX improvements
- [tasks.md](./tasks.md) — team task board
- [quests.md](./quests.md) — project quests & milestones
